// backend/src/routes/sync.ts
import { Router } from 'express';
// @ts-ignore - Arquivo do frontend, usado apenas para tipos
import { Change, ChangeType } from '../../utils/delta-sync';
// @ts-ignore - Arquivo do frontend, usado apenas para tipos
import { ConflictResolutionStrategy } from '../../utils/conflict-resolver';
import { getPool, getTableName } from '../utils/db-helper';
import { TotalService } from '../../lib/auditoriaPostgres';

const router = Router();

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
  conflicts?: any[];
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
      errors: [error instanceof Error ? error.message : 'Erro interno do servidor']
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
  
  try {
    for (const change of changes) {
      try {
        // Filtrar campos de controle que não existem no PostgreSQL
        const dataFiltered = { ...change.data };
        delete dataFiltered.id; // ✅ REMOVER: id será usado via change.recordId
        delete dataFiltered.sincronizado;
        delete dataFiltered.last_modified;
        delete dataFiltered.sync_attempts;
        
        const keys = Object.keys(dataFiltered);
        const values = Object.values(dataFiltered);
        
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
          totalData.id_auditoria, totalData.id_loja, totalData.sistema, totalData.foto,
          totalData.valor, totalData.qtd_vendas, totalData.data_auditoria, totalData.d_auditada,
          totalData.d_auditoria_h, totalData.d_audit, totalData.email_auditor, totalData.nome_loja,
          totalData.nome_tipo, totalData.pagamento, totalData.foto2, totalData.foto3, totalData.img01,
          totalData.img02, totalData.img03, totalData.assinatura, totalData.nome_luc, totalData.mes_ano,
          totalData.observacao
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
          
          const keys = Object.keys(dataFiltered);
          const values = Object.values(dataFiltered);
          
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
          
          const keys = Object.keys(dataFiltered);
          const values = Object.values(dataFiltered);
          
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
  
  try {
    for (const change of changes) {
      try {
        await client.query(
          `DELETE FROM ${tableName} WHERE id = $1`,
          [change.recordId]
        );
        
        result.changesApplied++;
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
