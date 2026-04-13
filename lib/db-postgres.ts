// lib/db-postgres.ts - CONEXÃO ENTERPRISE POSTGRESQL
import { Pool } from 'pg';

// ✅ CONFIGURAÇÃO COM VALIDAÇÃO
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurada');
  throw new Error('DATABASE_URL não configurada corretamente.');
}

// ✅ SCHEMA DINÂMICO POR SHOPPING
// Agora aceita schema como parâmetro (do JWT do usuário)
export function getSchemaName(schema?: string): string {
  // Prioridade: schema do parâmetro > ENV > padrão
  const finalSchema = schema || process.env.SHOPPING_SCHEMA || 'passeio';
  if (!schema) {
    console.log('🔍 [db-postgres] Schema sendo usado (fallback):', finalSchema);
  }
  return finalSchema;
}

// ✅ HELPER PARA TABELA COM SCHEMA
export function getTableName(tableName: string, schema?: string): string {
  const finalSchema = getSchemaName(schema);
  return `${finalSchema}.${tableName}`;
}

// ✅ CONEXÃO POSTGRESQL ENTERPRISE
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Suporta múltiplos apps simultâneos
  min: 2,  // Mantém conexões prontas
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 8000,
  allowExitOnIdle: true,
});

// ✅ EVENTOS DO POOL
pool.on('connect', () => {
  console.log('🔗 [db-postgres] Nova conexão estabelecida');
});

pool.on('error', (err) => {
  console.error('❌ [db-postgres] Erro no pool:', err);
});

pool.on('remove', () => {
  console.log('🔌 [db-postgres] Conexão removida do pool');
});

// ✅ HEALTH CHECK
export async function healthCheck(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ [db-postgres] Health check: OK');
    return true;
  } catch (error) {
    console.error('❌ [db-postgres] Health check: FAILED', error);
    return false;
  }
}

// ✅ SHUTDOWN GRACEFUL
export async function shutdown(): Promise<void> {
  console.log('🔄 [db-postgres] Encerrando pool...');
  await pool.end();
  console.log('✅ [db-postgres] Pool encerrado');
}

// ✅ WRAPPER PARA GARANTIR LIBERAÇÃO DE CONEXÕES
export async function withConnection<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

// ✅ EXPORT DO POOL
export { pool };
export default pool;

