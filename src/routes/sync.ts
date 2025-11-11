// backend/src/routes/sync.ts
import { Router } from 'express';
import crypto from 'crypto';
import { PoolClient } from 'pg';
// @ts-ignore - Arquivo do frontend, usado apenas para tipos
import { Change, ChangeType } from '../../utils/delta-sync';
// @ts-ignore - Arquivo do frontend, usado apenas para tipos
import { ConflictResolutionStrategy } from '../../utils/conflict-resolver';
import { getPool, getTableName } from '../utils/db-helper';
import {
  createDriveClient,
  decodeBase64Image,
  uploadBufferToDrive,
} from '../services/upload';
import { TotalService } from '../../lib/auditoriaPostgres';

const router = Router();

type ColumnCandidate = {
  name: string;
  type?: 'timestamp' | 'date' | 'text';
  expression?: (qualifiedColumn: string) => string;
};

type TableDeltaConfig = {
  idColumn: string;
  candidates: ColumnCandidate[];
};

const TABLE_DELTA_CONFIG: Record<string, TableDeltaConfig> = {
  auditoria: {
    idColumn: 'id',
    candidates: [
      { name: 'atualizado_em', type: 'timestamp' },
      { name: 'last_modified', type: 'text' },
      { name: 'criado_em', type: 'timestamp' },
      { name: 'data_auditoria', type: 'date' }
    ]
  },
  total: {
    idColumn: 'id',
    candidates: [
      { name: 'last_modified', type: 'text' },
      { name: 'atualizado_em', type: 'timestamp' },
      { name: 'criado_em', type: 'timestamp' },
      { name: 'd_auditada', type: 'date' },
      { name: 'data_auditoria', type: 'date' }
    ]
  },
  lojas: {
    idColumn: 'id_loja',
    candidates: [
      { name: 'atualizado_em', type: 'timestamp' },
      { name: 'criado_em', type: 'timestamp' },
      { name: 'last_modified', type: 'text' }
    ]
  },
  mapeamentos: {
    idColumn: 'id',
    candidates: [
      { name: 'atualizado_em', type: 'timestamp' },
      { name: 'criado_em', type: 'timestamp' },
      { name: 'last_modified', type: 'text' }
    ]
  },
  roteiros: {
    idColumn: 'id_roteiro',
    candidates: [
      { name: 'atualizado_em', type: 'timestamp' },
      { name: 'criado_em', type: 'timestamp' }
    ]
  },
  funcionarios: {
    idColumn: 'id',
    candidates: [
      { name: 'atualizado_em', type: 'timestamp' },
      { name: 'criado_em', type: 'timestamp' },
      { name: 'last_modified', type: 'text' }
    ]
  },
  rule_violations: {
    idColumn: 'id',
    candidates: [
      { name: 'resolved_at', type: 'timestamp' },
      { name: 'created_at', type: 'timestamp' }
    ]
  }
};

const timestampExpressionCache = new Map<string, string>();
const tombstoneTableCache = new Set<string>();

const ISO_FALLBACK = '1970-01-01T00:00:00.000Z';
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

function resolveSchemaName(schema?: string): string {
  return schema || process.env.SHOPPING_SCHEMA || 'passeio';
}

function normalizeLimit(rawLimit: any): number {
  const parsed = Number(rawLimit);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function buildCandidateExpression(columnRef: string, candidate: ColumnCandidate): string {
  if (candidate.expression) {
    return candidate.expression(columnRef);
  }

  switch (candidate.type) {
    case 'date':
      return `COALESCE(${columnRef}::timestamptz, '1970-01-01'::timestamptz)`;
    case 'text':
      return `COALESCE(NULLIF(${columnRef}, '')::timestamptz, '1970-01-01'::timestamptz)`;
    case 'timestamp':
    default:
      return `COALESCE(${columnRef}::timestamptz, '1970-01-01'::timestamptz)`;
  }
}

async function resolveTimestampExpression(table: string, schema?: string): Promise<string> {
  const schemaName = resolveSchemaName(schema);
  const cacheKey = `${schemaName}:${table}`;
  if (timestampExpressionCache.has(cacheKey)) {
    return timestampExpressionCache.get(cacheKey)!;
  }

  const config = TABLE_DELTA_CONFIG[table];
  if (!config) {
    timestampExpressionCache.set(cacheKey, 'NOW()');
    return 'NOW()';
  }

  const pool = getPool();
  const columnsResult = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
    `,
    [schemaName, table]
  );
  const available = new Set(
    columnsResult.rows.map((row: any) => row.column_name as string)
  );

  const expressions: string[] = [];
  for (const candidate of config.candidates) {
    if (!available.has(candidate.name)) {
      continue;
    }
    const columnRef = `"${candidate.name}"`;
    expressions.push(buildCandidateExpression(columnRef, candidate));
  }

  if (expressions.length === 0) {
    expressions.push('NOW()');
  }

  const finalExpr =
    expressions.length === 1
      ? expressions[0]
      : `GREATEST(${expressions.join(', ')})`;

  timestampExpressionCache.set(cacheKey, finalExpr);
  return finalExpr;
}

function getTombstoneTableName(schema?: string): string {
  const schemaName = resolveSchemaName(schema);
  return `"${schemaName}".sync_tombstones`;
}

function buildTombstoneIndexName(schema?: string): string {
  const schemaName = resolveSchemaName(schema);
  return `idx_${schemaName.replace(/[^a-zA-Z0-9_]/g, '_')}_sync_tombstones`;
}

async function ensureTombstoneTable(schema?: string): Promise<string> {
  const schemaName = resolveSchemaName(schema);
  if (tombstoneTableCache.has(schemaName)) {
    return getTombstoneTableName(schema);
  }

  const tableName = getTombstoneTableName(schema);
  const indexName = buildTombstoneIndexName(schema);
  const pool = getPool();

  await pool.query(
    `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id BIGSERIAL PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
  );

  await pool.query(
    `
      CREATE UNIQUE INDEX IF NOT EXISTS ${indexName}
      ON ${tableName} (table_name, record_id)
    `
  );

  tombstoneTableCache.add(schemaName);
  return tableName;
}

async function recordDeletion(
  client: PoolClient,
  schema: string | undefined,
  table: string,
  recordId: string,
  deletedAt: string
): Promise<void> {
  const tombstoneTable = await ensureTombstoneTable(schema);
  await client.query(
    `
      INSERT INTO ${tombstoneTable} (table_name, record_id, deleted_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (table_name, record_id)
      DO UPDATE SET deleted_at = EXCLUDED.deleted_at
    `,
    [table, recordId, deletedAt]
  );
}

function decodeCursor(cursor?: unknown): { timestamp: string; id: string } | null {
  if (!cursor || typeof cursor !== 'string') {
    return null;
  }
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [timestamp, id] = decoded.split('|');
    if (!timestamp || !id) {
      return null;
    }
    return { timestamp, id };
  } catch {
    return null;
  }
}

function encodeCursor(timestamp: string, id: string): string {
  return Buffer.from(`${timestamp}|${id}`).toString('base64');
}

function normalizeSince(value: unknown): string {
  if (!value) {
    return ISO_FALLBACK;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    return ISO_FALLBACK;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return ISO_FALLBACK;
  }
  return date.toISOString();
}

interface DeltaSyncRequest {
  table: string;
  changes: Change[];
  conflictResolution: ConflictResolutionStrategy;
}

interface DeltaSyncResponse {
  success: boolean;
  changesApplied: number;
  conflictsResolved: number;
  errors: string[];
  deletedRecords: DeletedRecord[];
  conflicts?: any[];
}

interface DeletedRecord {
  table: string;
  recordId: string;
  deletedAt?: string;
}

interface DeltaPullResponse {
  success: boolean;
  table: string;
  items: any[];
  deleted: DeletedRecord[];
  hasMore: boolean;
  nextCursor?: string;
  nextSince?: string;
  checksum?: string;
  fetched: number;
  errors?: string[];
}

// POST /api/sync/delta
router.post('/delta', async (req, res) => {
  try {
    const schema = req.schema; // Schema extraído do JWT pelo middleware
    const { table, changes, conflictResolution }: DeltaSyncRequest = req.body;

    if (!table || !changes || !Array.isArray(changes)) {
      return res.status(400).json({
        success: false,
        changesApplied: 0,
        conflictsResolved: 0,
        errors: ['Dados inválidos: table e changes são obrigatórios']
      });
    }

    console.log(`🔄 [BACKEND-DELTA-SYNC] Processando ${changes.length} mudanças para ${table} | Schema: ${schema}`);

    const result = await processDeltaSync(table, changes, conflictResolution, schema);

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('❌ [BACKEND-DELTA-SYNC] Erro:', error);
    
    return res.status(500).json({
      success: false,
      changesApplied: 0,
      conflictsResolved: 0,
      errors: [error instanceof Error ? error.message : 'Erro interno do servidor'],
      deletedRecords: []
    });
  }
});

// 🔹 Processar sincronização delta
async function processDeltaSync(
  table: string,
  changes: Change[],
  conflictResolution: ConflictResolutionStrategy,
  schema?: string
): Promise<DeltaSyncResponse> {
  const result: DeltaSyncResponse = {
    success: true,
    changesApplied: 0,
    conflictsResolved: 0,
    errors: [],
    deletedRecords: [],
    conflicts: []
  };

  try {
    // Agrupar mudanças por tipo
    const changesByType = groupChangesByType(changes);
    
    // Processar cada tipo de mudança
    for (const [changeType, typeChanges] of changesByType) {
      console.log(`📝 [BACKEND-DELTA-SYNC] Processando ${typeChanges.length} mudanças do tipo ${changeType}`);
      
      switch (changeType) {
        case ChangeType.CREATE:
          await processCreates(table, typeChanges, result, schema);
          break;
        
        case ChangeType.UPDATE:
          await processUpdates(table, typeChanges, result, schema);
          break;
        
        case ChangeType.DELETE:
          await processDeletes(table, typeChanges, result, schema);
          break;
      }
    }

    console.log(`✅ [BACKEND-DELTA-SYNC] Sincronização concluída: ${result.changesApplied} mudanças aplicadas`);
    
    return result;

  } catch (error) {
    console.error('❌ [BACKEND-DELTA-SYNC] Erro no processamento:', error);
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Erro desconhecido');
    return result;
  }
}

// 🔹 Agrupar mudanças por tipo
function groupChangesByType(changes: Change[]): Map<ChangeType, Change[]> {
  const grouped = new Map<ChangeType, Change[]>();
  
  for (const change of changes) {
    if (!grouped.has(change.type)) {
      grouped.set(change.type, []);
    }
    grouped.get(change.type)!.push(change);
  }
  
  return grouped;
}

// 🔹 Processar criações
async function processCreates(
  table: string,
  changes: Change[],
  result: DeltaSyncResponse,
  schema?: string
): Promise<void> {
  console.log(`➕ [BACKEND-DELTA-SYNC] Processando ${changes.length} criações para ${table}`);
  
  // ✅ ENTERPRISE: Tratamento específico para cada tabela
  if (table === 'total') {
    await processCreatesTotal(changes, result, schema);
    return;
  }
  
  // Para outras tabelas, usar INSERT genérico
  const pool = getPool();
  const tableName = getTableName(table, schema);
  const client = await pool.connect();
  const drive = createDriveClient();
  
  try {
    for (const change of changes) {
      try {
        // Filtrar campos de controle que não existem no PostgreSQL
        const dataFiltered = { ...change.data };
        delete dataFiltered.id; // ✅ REMOVER: id será usado via change.recordId
        delete dataFiltered.sincronizado;
        delete dataFiltered.last_modified;
        delete dataFiltered.sync_attempts;
        
        const normalizedData = await normalizePhotoFields(
          dataFiltered,
          change.recordId,
          drive,
          {
            idLoja: dataFiltered.id_loja || dataFiltered.idLoja,
          }
        );
        
        const keys = Object.keys(normalizedData);
        const values = Object.values(normalizedData);
        
        if (keys.length === 0) {
          console.warn(`⚠️ [BACKEND-DELTA-SYNC] Nenhum campo válido para ${change.recordId}`);
          continue;
        }
        
        // ✅ Incluir id explicitamente usando change.recordId
        await client.query(
          `INSERT INTO ${tableName} (id, ${keys.join(', ')}) 
           VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(', ')})`,
          [change.recordId, ...values]
        );
        
        result.changesApplied++;
        console.log(`✅ [BACKEND-DELTA-SYNC] Registro criado: ${change.recordId}`);
      } catch (error) {
        const errorMessage = `Erro ao criar ${change.recordId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        result.errors.push(errorMessage);
        console.error(`❌ [BACKEND-DELTA-SYNC] ${errorMessage}`);
      }
    }
  } finally {
    client.release();
  }
}

// ✅ ENTERPRISE: Processar criações de Total (tabela total)
async function processCreatesTotal(
  changes: Change[],
  result: DeltaSyncResponse,
  schema?: string
): Promise<void> {
  console.log(`➕ [BACKEND-DELTA-SYNC] Processando ${changes.length} criações de Total`);
  
  const pool = getPool();
  const tableName = getTableName('total', schema);
  const client = await pool.connect();
  const drive = createDriveClient();
  
  try {
    for (const change of changes) {
      try {
        const data = change.data as any;
        
        // ✅ Mapear campos do TotalEntity para o formato do PostgreSQL
        // ✅ IMPORTANTE: Usar change.recordId como id (não incluir id de change.data)
        
        const totalData = {
          id_auditoria: data.id_auditoria || data.idAuditoria || '',
          id_loja: data.id_loja || data.idLoja || '',
          sistema: data.sistema || null,
          foto: data.foto || null,
          valor: data.valor != null ? parseFloat(String(data.valor)) : null,
          qtd_vendas: data.qtd_vendas != null ? parseInt(String(data.qtd_vendas)) : null,
          data_auditoria: data.data_auditoria || null,
          d_auditada: data.d_auditada || data.dAuditada || null,
          d_auditoria_h: data.d_auditoria_h || data.dAuditoriaH || null,
          d_audit: data.d_audit || data.dAudit || null,
          email_auditor: data.email_auditor || data.emailAuditor || null,
          nome_loja: data.nome_loja || data.nomeLoja || null,
          nome_tipo: data.nome_tipo || data.nomeTipo || null,
          pagamento: data.pagamento || null,
          foto2: data.foto2 || null,
          foto3: data.foto3 || null,
          img01: data.img01 || null,
          img02: data.img02 || null,
          img03: data.img03 || null,
          assinatura: data.assinatura || null,
          nome_luc: data.nome_luc || data.nomeLuc || null,
          mes_ano: data.mes_ano || data.mesAno || null,
          observacao: data.observacao || null
        };
        
        const normalizedTotal = await normalizePhotoFields(
          totalData,
          change.recordId,
          drive,
          {
            idLoja: totalData.id_loja,
          }
        );
        
        // ✅ INSERT direto com id explícito (change.recordId)
        // Não usar TotalService.createTotal porque ele não aceita id
        await client.query(`
          INSERT INTO ${tableName} (
            id, id_auditoria, id_loja, sistema, foto, valor, qtd_vendas,
            data_auditoria, d_auditada, d_auditoria_h, d_audit, email_auditor,
            nome_loja, nome_tipo, pagamento, foto2, foto3, img01, img02, img03,
            assinatura, nome_luc, mes_ano, observacao
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          RETURNING *
        `, [
          change.recordId, // ✅ Usar change.recordId como id (não de change.data)
          normalizedTotal.id_auditoria, normalizedTotal.id_loja, normalizedTotal.sistema, normalizedTotal.foto,
          normalizedTotal.valor, normalizedTotal.qtd_vendas, normalizedTotal.data_auditoria, normalizedTotal.d_auditada,
          normalizedTotal.d_auditoria_h, normalizedTotal.d_audit, normalizedTotal.email_auditor, normalizedTotal.nome_loja,
          normalizedTotal.nome_tipo, normalizedTotal.pagamento, normalizedTotal.foto2, normalizedTotal.foto3, normalizedTotal.img01,
          normalizedTotal.img02, normalizedTotal.img03, normalizedTotal.assinatura, normalizedTotal.nome_luc, normalizedTotal.mes_ano,
          normalizedTotal.observacao
        ]);
        
        result.changesApplied++;
        console.log(`✅ [BACKEND-DELTA-SYNC] Total criado: ${change.recordId}`);
      } catch (error) {
        const errorMessage = `Erro ao criar Total ${change.recordId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        result.errors.push(errorMessage);
        console.error(`❌ [BACKEND-DELTA-SYNC] ${errorMessage}`, error);
      }
    }
  } finally {
    client.release();
  }
}

// 🔹 Processar atualizações
async function processUpdates(
  table: string,
  changes: Change[],
  result: DeltaSyncResponse,
  schema?: string
): Promise<void> {
  console.log(`🔄 [BACKEND-DELTA-SYNC] Processando ${changes.length} atualizações para ${table}`);
  
  const pool = getPool();
  const tableName = getTableName(table, schema);
  const client = await pool.connect();
  const drive = createDriveClient();
  
  try {
    for (const change of changes) {
      try {
        // Verificar se há conflito
        const existingResult = await client.query(
          `SELECT * FROM ${tableName} WHERE id = $1`,
          [change.recordId]
        );
        
        if (existingResult.rows.length > 0) {
          // ✅ Filtrar campos de controle e id (não devem ser atualizados)
          const dataFiltered = { ...change.data };
          delete dataFiltered.id; // ✅ REMOVER: id não deve ser atualizado
          delete dataFiltered.sincronizado;
          delete dataFiltered.last_modified;
          delete dataFiltered.sync_attempts;
          
          const normalizedData = await normalizePhotoFields(
            dataFiltered,
            change.recordId,
            drive,
            {
              idLoja: dataFiltered.id_loja || dataFiltered.idLoja,
            }
          );
          
          const keys = Object.keys(normalizedData);
          const values = Object.values(normalizedData);
          
          if (keys.length === 0) {
            console.warn(`⚠️ [BACKEND-DELTA-SYNC] Nenhum campo válido para atualizar ${change.recordId}`);
            continue;
          }
          
          // Atualizar
          const updateFields = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
          await client.query(
            `UPDATE ${tableName} SET ${updateFields} WHERE id = $1`,
            [change.recordId, ...values] // ✅ Usar values filtrados
          );
          
          result.changesApplied++;
          result.conflictsResolved++;
          console.log(`✅ [BACKEND-DELTA-SYNC] Registro atualizado: ${change.recordId}`);
        } else {
          // Criar se não existe
          // ✅ Filtrar campos de controle e id
          const dataFiltered = { ...change.data };
          delete dataFiltered.id; // ✅ REMOVER: id será usado via change.recordId
          delete dataFiltered.sincronizado;
          delete dataFiltered.last_modified;
          delete dataFiltered.sync_attempts;
          
          const normalizedData = await normalizePhotoFields(
            dataFiltered,
            change.recordId,
            drive,
            {
              idLoja: dataFiltered.id_loja || dataFiltered.idLoja,
            }
          );
          
          const keys = Object.keys(normalizedData);
          const values = Object.values(normalizedData);
          
          if (keys.length === 0) {
            console.warn(`⚠️ [BACKEND-DELTA-SYNC] Nenhum campo válido para criar ${change.recordId}`);
            continue;
          }
          
          await client.query(
            `INSERT INTO ${tableName} (id, ${keys.join(', ')}) 
             VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(', ')})`,
            [change.recordId, ...values] // ✅ Usar values filtrados
          );
          
          result.changesApplied++;
          console.log(`✅ [BACKEND-DELTA-SYNC] Registro criado (era update): ${change.recordId}`);
        }
      } catch (error) {
        const errorMessage = `Erro ao atualizar ${change.recordId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        result.errors.push(errorMessage);
        console.error(`❌ [BACKEND-DELTA-SYNC] ${errorMessage}`);
      }
    }
  } finally {
    client.release();
  }
}

// 🔹 Processar exclusões
async function processDeletes(
  table: string,
  changes: Change[],
  result: DeltaSyncResponse,
  schema?: string
): Promise<void> {
  console.log(`🗑️ [BACKEND-DELTA-SYNC] Processando ${changes.length} exclusões para ${table}`);
  
  const pool = getPool();
  const tableName = getTableName(table, schema);
  const client = await pool.connect();
  const totalTableName = getTableName('total', schema);
  
  try {
    for (const change of changes) {
      try {
        if (table === 'auditoria') {
          const totalsToDelete = await client.query(
            `SELECT id FROM ${totalTableName} WHERE id_auditoria = $1`,
            [change.recordId]
          );

          for (const row of totalsToDelete.rows) {
            const totalDeletedAt = new Date().toISOString();
            await client.query(
              `DELETE FROM ${totalTableName} WHERE id = $1`,
              [row.id]
            );
            await recordDeletion(client, schema, 'total', row.id, totalDeletedAt);
            result.deletedRecords.push({
              table: 'total',
              recordId: row.id,
              deletedAt: totalDeletedAt
            });
            console.log(`🗑️ [BACKEND-DELTA-SYNC] Total dependente removido: ${row.id}`);
          }
        }

        const deletedAt = new Date().toISOString();
        await client.query(
          `DELETE FROM ${tableName} WHERE id = $1`,
          [change.recordId]
        );
        await recordDeletion(client, schema, table, change.recordId, deletedAt);
        
        result.changesApplied++;
        result.deletedRecords.push({
          table,
          recordId: change.recordId,
          deletedAt
        });
        console.log(`✅ [BACKEND-DELTA-SYNC] Registro excluído: ${change.recordId}`);
      } catch (error) {
        const errorMessage = `Erro ao excluir ${change.recordId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        result.errors.push(errorMessage);
        console.error(`❌ [BACKEND-DELTA-SYNC] ${errorMessage}`);
      }
    }
  } finally {
    client.release();
  }
}

const PHOTO_FIELDS = ['assinatura'];

router.get('/pull', async (req, res) => {
  try {
    const schema = req.schema;
    const tableParam = req.query.table;
    if (!tableParam || typeof tableParam !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Parâmetro "table" é obrigatório',
      });
    }

    const table = tableParam.toLowerCase();
    const config = TABLE_DELTA_CONFIG[table];
    if (!config) {
      return res.status(400).json({
        success: false,
        error: `Tabela não suportada: ${table}`,
      });
    }

    const limit = normalizeLimit(req.query.limit);
    const since = normalizeSince(req.query.since);
    const cursorInfo = decodeCursor(req.query.cursor);
    const baselineTimestamp = cursorInfo?.timestamp ?? since;

    const timestampExpr = await resolveTimestampExpression(table, schema);
    const tableName = getTableName(table, schema);
    const idColumnRef = `"${config.idColumn}"`;
    const idColumnComparator = `${idColumnRef}::text`;

    const params: any[] = [];
    let whereClause: string;

    if (cursorInfo) {
      whereClause = `(${timestampExpr} > $1) OR (${timestampExpr} = $1 AND ${idColumnComparator} > $2)`;
      params.push(cursorInfo.timestamp);
      params.push(cursorInfo.id);
    } else {
      whereClause = `${timestampExpr} > $1`;
      params.push(baselineTimestamp);
    }

    params.push(limit);

    const query = `
      SELECT *, ${timestampExpr} AS _sync_timestamp
      FROM ${tableName}
      WHERE ${whereClause}
      ORDER BY _sync_timestamp ASC, ${idColumnRef} ASC
      LIMIT $${params.length}
    `;

    const pool = getPool();
    const client = await pool.connect();

    try {
      const dataResult = await client.query(query, params);
      const rows = dataResult.rows;
      const items = rows.map(({ _sync_timestamp, ...rest }) => rest);
      const hasMore = rows.length === limit;

      let nextCursor: string | undefined;
      let nextSince: string | undefined;

      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const timestampValue = new Date(lastRow._sync_timestamp).toISOString();
        const recordId = lastRow[config.idColumn];
        nextSince = timestampValue;
        if (recordId !== undefined && recordId !== null) {
          nextCursor = encodeCursor(timestampValue, String(recordId));
        }
      } else {
        nextSince = baselineTimestamp;
      }

      await ensureTombstoneTable(schema);
      const tombstoneTable = getTombstoneTableName(schema);
      const deletionsResult = await client.query(
        `
          SELECT record_id, deleted_at
          FROM ${tombstoneTable}
          WHERE table_name = $1 AND deleted_at > $2
          ORDER BY deleted_at ASC
          LIMIT $3
        `,
        [table, baselineTimestamp, limit]
      );

      const deleted = deletionsResult.rows.map((row) => ({
        table,
        recordId: row.record_id,
        deletedAt: new Date(row.deleted_at).toISOString(),
      }));

      const checksum =
        rows.length > 0
          ? crypto.createHash('md5').update(JSON.stringify(rows)).digest('hex')
          : undefined;

      const response: DeltaPullResponse = {
        success: true,
        table,
        items,
        deleted,
        hasMore,
        nextCursor,
        nextSince,
        checksum,
        fetched: rows.length,
      };

      return res.status(200).json(response);
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error?.code === '42P01') {
      const table = typeof req.query.table === 'string' ? req.query.table : String(req.query.table);
      console.warn(`⚠️ [BACKEND-DELTA-PULL] Tabela inexistente (${table}). Retornando coleção vazia.`);
      const emptyResponse: DeltaPullResponse = {
        success: true,
        table,
        items: [],
        deleted: [],
        hasMore: false,
        fetched: 0,
        errors: [],
      };
      return res.status(200).json(emptyResponse);
    }
    console.error('❌ [BACKEND-DELTA-PULL] Erro:', error);
    return res.status(500).json({
      success: false,
      table: req.query.table,
      items: [],
      deleted: [],
      hasMore: false,
      fetched: 0,
      errors: [error instanceof Error ? error.message : 'Erro interno do servidor'],
    });
  }
});

async function normalizePhotoFields(
  data: Record<string, any>,
  recordId: string,
  drive: ReturnType<typeof createDriveClient>,
  options?: {
    idLoja?: string | null;
    folderPrefix?: string | null;
  }
): Promise<Record<string, any>> {
  const updated: Record<string, any> = { ...data };

  for (const field of PHOTO_FIELDS) {
    const value = updated[field];
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed.startsWith('data:image')) {
      continue;
    }

    try {
      const { buffer, detectedMime } = decodeBase64Image(trimmed);
      const { filePath } = await uploadBufferToDrive({
        drive,
        buffer,
        originalMimeType: detectedMime || 'image/jpeg',
        idDispositivo: `${recordId}_${field}`,
        folderPrefix: options?.folderPrefix ?? undefined,
        nome: field,
        lojaId: options?.idLoja ?? undefined,
      });

      updated[field] = filePath;
      console.log(`📁 [BACKEND-DELTA-SYNC] Foto ${field} convertida para caminho: ${filePath}`);
    } catch (error) {
      console.error(`❌ [BACKEND-DELTA-SYNC] Erro ao processar foto ${field} (${recordId}):`, error);
    }
  }

  return updated;
}

// POST /api/sync/offline-data
router.post('/offline-data', async (req, res) => {
  try {
    // Implementar conforme necessário (migrar de pages/api/sync/offline-data.ts)
    res.status(200).json({ message: 'Not implemented yet' });
  } catch (error: any) {
    console.error('❌ [BACKEND-sync-offline-data] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
