"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuarioService = exports.CadastroAuditoriaService = exports.RoteiroService = void 0;
exports.getRoteiroData = getRoteiroData;
exports.getCadastroAuditoriaDataWithLoja = getCadastroAuditoriaDataWithLoja;
exports.getUsuarioData = getUsuarioData;
// lib/roteiroPostgres.ts - ENTERPRISE POSTGRESQL ROTEIROS
const db_postgres_1 = require("./db-postgres");
/** Serviço Enterprise para Roteiros */
class RoteiroService {
    /** Buscar todos os roteiros */
    static async getRoteiros(schema) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('roteiros', schema);
            const result = await client.query(`
        SELECT 
          id_roteiro,
          roteiro,
          status,
          descricao,
          created_at
        FROM ${tableName}
        ORDER BY created_at DESC
      `);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [RoteiroService] Erro ao buscar roteiros:', error);
            throw error;
        }
    }
    /** Buscar roteiro por ID */
    static async getRoteiroById(idRoteiro) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('roteiros');
            const result = await client.query(`
        SELECT 
          id_roteiro,
          roteiro,
          status,
          descricao,
          created_at
        FROM ${tableName}
        WHERE id_roteiro = $1
      `, [idRoteiro]);
            client.release();
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ [RoteiroService] Erro ao buscar roteiro:', error);
            throw error;
        }
    }
    /** Criar novo roteiro */
    static async createRoteiro(roteiro) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('roteiros');
            const result = await client.query(`
        INSERT INTO ${tableName} (id_roteiro, roteiro, status, descricao)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [roteiro.id_roteiro, roteiro.roteiro, roteiro.status, roteiro.descricao]);
            client.release();
            return result.rows[0];
        }
        catch (error) {
            console.error('❌ [RoteiroService] Erro ao criar roteiro:', error);
            throw error;
        }
    }
    /** Atualizar roteiro */
    static async updateRoteiro(idRoteiro, updates) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('roteiros');
            const setClause = Object.keys(updates)
                .filter(key => key !== 'id_roteiro' && key !== 'created_at')
                .map((key, index) => `${key} = $${index + 2}`)
                .join(', ');
            const values = [idRoteiro, ...Object.values(updates).filter((_, index) => Object.keys(updates)[index] !== 'id_roteiro' && Object.keys(updates)[index] !== 'created_at')];
            const result = await client.query(`
        UPDATE ${tableName}
        SET ${setClause}, atualizado_em = NOW()
        WHERE id_roteiro = $1
        RETURNING *
      `, values);
            client.release();
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ [RoteiroService] Erro ao atualizar roteiro:', error);
            throw error;
        }
    }
    /** Deletar roteiro */
    static async deleteRoteiro(idRoteiro) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('roteiros');
            const result = await client.query(`
        DELETE FROM ${tableName}
        WHERE id_roteiro = $1
      `, [idRoteiro]);
            client.release();
            return result.rowCount > 0;
        }
        catch (error) {
            console.error('❌ [RoteiroService] Erro ao deletar roteiro:', error);
            throw error;
        }
    }
}
exports.RoteiroService = RoteiroService;
/** Serviço Enterprise para Cadastro de Auditoria */
class CadastroAuditoriaService {
    /** Buscar cadastros com dados da loja */
    static async getCadastrosWithLoja(schema) {
        try {
            const client = await db_postgres_1.pool.connect();
            const cadastroTable = (0, db_postgres_1.getTableName)('cadastro', schema);
            const lojaTable = (0, db_postgres_1.getTableName)('lojas', schema);
            const result = await client.query(`
        SELECT 
          c.id,
          c.id_roteiro,
          c.id_loja,
          c.status,
          c.created_at,
          l.nome_loja,
          l.nome_luc,
          l.segmentos,
          l.img_loja
        FROM ${cadastroTable} c
        LEFT JOIN ${lojaTable} l ON c.id_loja = l.id_loja
        ORDER BY c.created_at DESC
      `);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [CadastroAuditoriaService] Erro ao buscar cadastros:', error);
            throw error;
        }
    }
    /** Criar novo cadastro */
    static async createCadastro(cadastro) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('cadastro');
            const result = await client.query(`
        INSERT INTO ${tableName} (id, id_roteiro, id_loja, status)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [cadastro.id, cadastro.id_roteiro, cadastro.id_loja, cadastro.status]);
            client.release();
            return result.rows[0];
        }
        catch (error) {
            console.error('❌ [CadastroAuditoriaService] Erro ao criar cadastro:', error);
            throw error;
        }
    }
}
exports.CadastroAuditoriaService = CadastroAuditoriaService;
/** Serviço Enterprise para Usuários */
class UsuarioService {
    /** Buscar todos os usuários */
    static async getUsuarios() {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('usuarios');
            const result = await client.query(`
        SELECT 
          id_user,
          nome_user,
          email_user,
          permissao,
          status,
          username
        FROM ${tableName}
        ORDER BY nome_user
      `);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [UsuarioService] Erro ao buscar usuários:', error);
            throw error;
        }
    }
}
exports.UsuarioService = UsuarioService;
/** Funções principais para compatibilidade com lib/roteiroSheets.ts */
async function getRoteiroData(schema) {
    return await RoteiroService.getRoteiros(schema);
}
async function getCadastroAuditoriaDataWithLoja(schema) {
    return await CadastroAuditoriaService.getCadastrosWithLoja(schema);
}
async function getUsuarioData() {
    return await UsuarioService.getUsuarios();
}
