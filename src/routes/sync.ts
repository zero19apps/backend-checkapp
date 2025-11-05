// backend/src/routes/sync.ts
import { Router } from 'express';
// @ts-ignore - Arquivo do frontend, usado apenas para tipos
import { Change, ChangeType } from '../../utils/delta-sync';
// @ts-ignore - Arquivo do frontend, usado apenas para tipos
import { ConflictResolutionStrategy } from '../../utils/conflict-resolver';
import { getPool, getTableName } from '../utils/db-helper';

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
  
  const pool = getPool();
  const tableName = getTableName(table, schema);
  const client = await pool.connect();
  
  try {
    for (const change of changes) {
      try {
        // Implementar INSERT real no PostgreSQL conforme a tabela
        await client.query(
          `INSERT INTO ${tableName} (${Object.keys(change.data).join(', ')}) 
           VALUES (${Object.keys(change.data).map((_, i) => `$${i + 1}`).join(', ')})`,
          Object.values(change.data)
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
          // Atualizar
          const updateFields = Object.keys(change.data).map((key, i) => `${key} = $${i + 2}`).join(', ');
          await client.query(
            `UPDATE ${tableName} SET ${updateFields} WHERE id = $1`,
            [change.recordId, ...Object.values(change.data)]
          );
          
          result.changesApplied++;
          result.conflictsResolved++;
          console.log(`✅ [BACKEND-DELTA-SYNC] Registro atualizado: ${change.recordId}`);
        } else {
          // Criar se não existe
          await client.query(
            `INSERT INTO ${tableName} (id, ${Object.keys(change.data).join(', ')}) 
             VALUES ($1, ${Object.keys(change.data).map((_, i) => `$${i + 2}`).join(', ')})`,
            [change.recordId, ...Object.values(change.data)]
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
