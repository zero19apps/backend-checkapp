"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFuncionarios = getFuncionarios;
exports.createFuncionario = createFuncionario;
exports.updateFuncionarioStatus = updateFuncionarioStatus;
// lib/funcionarioPostgres.ts - ENTERPRISE POSTGRESQL FUNCIONÁRIOS
const crypto_1 = require("crypto");
const db_postgres_1 = require("./db-postgres");
function normalizeStatus(status) {
    if (typeof status === 'boolean') {
        return status ? 1 : 0;
    }
    if (typeof status === 'number') {
        return status !== 0 ? 1 : 0;
    }
    if (typeof status === 'string') {
        const value = status.trim().toLowerCase();
        if (['1', 'true', 'ativo', 'atual'].includes(value)) {
            return 1;
        }
        if (['0', 'false', 'inativo', 'inact'].includes(value)) {
            return 0;
        }
    }
    // Valor padrão: ativo
    return 1;
}
async function getFuncionarios(schema) {
    const client = await db_postgres_1.pool.connect();
    try {
        const tableName = (0, db_postgres_1.getTableName)('funcionarios', schema);
        const result = await client.query(`
        SELECT
          id,
          id_loja,
          nome_loja,
          nome_funcionario,
          status,
          criado_em,
          atualizado_em
        FROM ${tableName}
        ORDER BY nome_funcionario ASC, criado_em DESC
      `);
        return result.rows;
    }
    finally {
        client.release();
    }
}
async function createFuncionario(payload, schema) {
    const client = await db_postgres_1.pool.connect();
    try {
        const tableName = (0, db_postgres_1.getTableName)('funcionarios', schema);
        const id = payload.id ?? (0, crypto_1.randomUUID)();
        const statusValue = normalizeStatus(payload.status);
        const result = await client.query(`
        INSERT INTO ${tableName} (
          id,
          id_loja,
          nome_loja,
          nome_funcionario,
          status,
          criado_em,
          atualizado_em
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `, [
            id,
            payload.id_loja,
            payload.nome_loja ?? null,
            payload.nome_funcionario,
            statusValue,
        ]);
        return result.rows[0];
    }
    finally {
        client.release();
    }
}
async function updateFuncionarioStatus(id, status, schema) {
    const client = await db_postgres_1.pool.connect();
    try {
        const tableName = (0, db_postgres_1.getTableName)('funcionarios', schema);
        const statusValue = normalizeStatus(status);
        const result = await client.query(`
        UPDATE ${tableName}
           SET status = $1,
               atualizado_em = NOW()
         WHERE id = $2
        RETURNING *
      `, [statusValue, id]);
        if (result.rowCount === 0) {
            throw new Error('Funcionário não encontrado');
        }
        return result.rows[0];
    }
    finally {
        client.release();
    }
}
