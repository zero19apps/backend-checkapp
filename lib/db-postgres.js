"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.getSchemaName = getSchemaName;
exports.getTableName = getTableName;
exports.healthCheck = healthCheck;
exports.shutdown = shutdown;
exports.withConnection = withConnection;
// lib/db-postgres.ts - CONEXÃO ENTERPRISE POSTGRESQL
const pg_1 = require("pg");
// ✅ CONFIGURAÇÃO COM VALIDAÇÃO
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada');
    throw new Error('DATABASE_URL não configurada corretamente.');
}
// ✅ SCHEMA DINÂMICO POR SHOPPING
// Agora aceita schema como parâmetro (do JWT do usuário)
function getSchemaName(schema) {
    // Prioridade: schema do parâmetro > ENV > padrão
    const finalSchema = schema || process.env.SHOPPING_SCHEMA || 'passeio';
    if (!schema) {
        console.log('🔍 [db-postgres] Schema sendo usado (fallback):', finalSchema);
    }
    return finalSchema;
}
// ✅ HELPER PARA TABELA COM SCHEMA
function getTableName(tableName, schema) {
    const finalSchema = getSchemaName(schema);
    return `${finalSchema}.${tableName}`;
}
// ✅ CONEXÃO POSTGRESQL ENTERPRISE
const pool = new pg_1.Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 2, // Máximo 2 conexões simultâneas
    min: 0, // Sem conexões mínimas
    idleTimeoutMillis: 10000, // 10 segundos (mais agressivo)
    connectionTimeoutMillis: 5000, // 5 segundos
    allowExitOnIdle: true, // Permite sair quando idle
});
exports.pool = pool;
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
async function healthCheck() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ [db-postgres] Health check: OK');
        return true;
    }
    catch (error) {
        console.error('❌ [db-postgres] Health check: FAILED', error);
        return false;
    }
}
// ✅ SHUTDOWN GRACEFUL
async function shutdown() {
    console.log('🔄 [db-postgres] Encerrando pool...');
    await pool.end();
    console.log('✅ [db-postgres] Pool encerrado');
}
// ✅ WRAPPER PARA GARANTIR LIBERAÇÃO DE CONEXÕES
async function withConnection(callback) {
    const client = await pool.connect();
    try {
        return await callback(client);
    }
    finally {
        client.release();
    }
}
exports.default = pool;
