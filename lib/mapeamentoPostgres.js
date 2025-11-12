"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapeamentoService = void 0;
// lib/mapeamentoPostgres.ts - ENTERPRISE POSTGRESQL MAPEAMENTOS
const db_postgres_1 = require("./db-postgres");
/** Serviço Enterprise para Mapeamentos */
class MapeamentoService {
    /** Buscar todos os mapeamentos */
    static async getMapeamentos() {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('mapeamentos');
            const result = await client.query(`
        SELECT 
          id,
          id_loja,
          sistema,
          tipo,
          status,
          nserie,
          relatorio,
          possui_tef,
          foto,
          observacao,
          dcriacao,
          prioridade,
          criado_em,
          atualizado_em
        FROM ${tableName}
        ORDER BY criado_em DESC
      `);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [MapeamentoService] Erro ao buscar mapeamentos:', error);
            throw error;
        }
    }
    /** Buscar mapeamentos por loja */
    static async getMapeamentosByLoja(idLoja) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('mapeamentos');
            const result = await client.query(`
        SELECT 
          id,
          id_loja,
          sistema,
          tipo,
          status,
          nserie,
          relatorio,
          possui_tef,
          foto,
          observacao,
          dcriacao,
          prioridade,
          criado_em,
          atualizado_em
        FROM ${tableName}
        WHERE id_loja = $1
        ORDER BY tipo, sistema
      `, [idLoja]);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [MapeamentoService] Erro ao buscar mapeamentos por loja:', error);
            throw error;
        }
    }
    /** Buscar mapeamento por ID */
    static async getMapeamentoById(id) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('mapeamentos');
            const result = await client.query(`
        SELECT 
          id,
          id_loja,
          sistema,
          tipo,
          status,
          nserie,
          relatorio,
          possui_tef,
          foto,
          observacao,
          dcriacao,
          prioridade,
          criado_em,
          atualizado_em
        FROM ${tableName}
        WHERE id = $1
      `, [id]);
            client.release();
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ [MapeamentoService] Erro ao buscar mapeamento:', error);
            throw error;
        }
    }
    /** Buscar mapeamentos por tipo */
    static async getMapeamentosByTipo(tipo) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('mapeamentos');
            const result = await client.query(`
        SELECT 
          id,
          id_loja,
          sistema,
          tipo,
          status,
          nserie,
          relatorio,
          possui_tef,
          foto,
          observacao,
          dcriacao,
          prioridade,
          criado_em,
          atualizado_em
        FROM ${tableName}
        WHERE tipo = $1
        ORDER BY sistema
      `, [tipo]);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [MapeamentoService] Erro ao buscar mapeamentos por tipo:', error);
            throw error;
        }
    }
    /** Criar novo mapeamento */
    static async createMapeamento(mapeamento) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('mapeamentos');
            const result = await client.query(`
        INSERT INTO ${tableName} (
          id, id_loja, sistema, tipo, status, nserie, relatorio,
          possui_tef, foto, observacao, dcriacao, prioridade
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
                mapeamento.id, mapeamento.id_loja, mapeamento.sistema, mapeamento.tipo,
                mapeamento.status, mapeamento.nserie, mapeamento.relatorio,
                mapeamento.possui_tef, mapeamento.foto, mapeamento.observacao,
                mapeamento.dcriacao, mapeamento.prioridade
            ]);
            client.release();
            return result.rows[0];
        }
        catch (error) {
            console.error('❌ [MapeamentoService] Erro ao criar mapeamento:', error);
            throw error;
        }
    }
    /** Atualizar mapeamento */
    static async updateMapeamento(id, updates) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('mapeamentos');
            const setClause = Object.keys(updates)
                .filter(key => key !== 'id' && key !== 'criado_em')
                .map((key, index) => `${key} = $${index + 2}`)
                .join(', ');
            const values = [id, ...Object.values(updates).filter((_, index) => Object.keys(updates)[index] !== 'id' && Object.keys(updates)[index] !== 'criado_em')];
            const result = await client.query(`
        UPDATE ${tableName}
        SET ${setClause}, atualizado_em = NOW()
        WHERE id = $1
        RETURNING *
      `, values);
            client.release();
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ [MapeamentoService] Erro ao atualizar mapeamento:', error);
            throw error;
        }
    }
    /** Deletar mapeamento */
    static async deleteMapeamento(id) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('mapeamentos');
            const result = await client.query(`
        DELETE FROM ${tableName}
        WHERE id = $1
      `, [id]);
            client.release();
            return result.rowCount > 0;
        }
        catch (error) {
            console.error('❌ [MapeamentoService] Erro ao deletar mapeamento:', error);
            throw error;
        }
    }
    /** Verificar se tipo já existe para a loja */
    static async tipoExistsForLoja(idLoja, tipo) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('mapeamentos');
            const result = await client.query(`
        SELECT COUNT(*) as count
        FROM ${tableName}
        WHERE id_loja = $1 AND tipo = $2
      `, [idLoja, tipo]);
            client.release();
            return parseInt(result.rows[0].count) > 0;
        }
        catch (error) {
            console.error('❌ [MapeamentoService] Erro ao verificar tipo:', error);
            throw error;
        }
    }
}
exports.MapeamentoService = MapeamentoService;
