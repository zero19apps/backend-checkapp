"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.totalService = exports.auditoriaService = exports.TotalService = exports.AuditoriaService = void 0;
exports.getAuditoriasData = getAuditoriasData;
exports.getTotalAuditoriaData = getTotalAuditoriaData;
// lib/auditoriaPostgres.ts - ENTERPRISE POSTGRESQL AUDITORIA
const db_postgres_1 = require("./db-postgres");
/** Serviço Enterprise para Auditoria */
class AuditoriaService {
    /** Buscar todas as auditorias */
    static async getAuditorias(idRoteiro) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('auditoria');
            const lojasTableName = (0, db_postgres_1.getTableName)('lojas');
            const mapeamentosTableName = (0, db_postgres_1.getTableName)('mapeamentos');
            let query = `
        SELECT 
          a.id,
          a.id_r_auditoria,
          a.hora,
          a.id_loja,
          a.data_auditoria,
          a.auditor,
          a.observacao,
          a.assinatura_func,
          a.tipo_auditoria,
          a.mes_ano,
          a.atendente,
          a.criado_em,
          a.atualizado_em,
          CONCAT(l.nome_loja, ' - ', l.luc_box) AS nome_loja,
          l.img_loja,
          l.segmentos,
          STRING_AGG(DISTINCT CASE WHEN m.status = 'ATIVO' THEN m.tipo END, ', ') AS tipos_dispositivos
        FROM ${tableName} a
        LEFT JOIN ${lojasTableName} l ON a.id_loja = l.id_loja
        LEFT JOIN ${mapeamentosTableName} m ON a.id_loja = m.id_loja
      `;
            const params = [];
            if (idRoteiro) {
                query += ` WHERE id_r_auditoria = $1`;
                params.push(idRoteiro);
            }
            query += ` GROUP BY a.id, a.id_r_auditoria, a.hora, a.id_loja, a.data_auditoria, a.auditor, a.observacao, a.assinatura_func, a.tipo_auditoria, a.mes_ano, a.atendente, a.criado_em, a.atualizado_em, l.nome_loja, l.luc_box, l.img_loja, l.segmentos`;
            query += ` ORDER BY a.data_auditoria DESC, a.criado_em DESC`;
            const result = await client.query(query, params);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [AuditoriaService] Erro ao buscar auditorias:', error);
            throw error;
        }
    }
    /** Buscar auditoria por ID */
    static async getAuditoriaById(id) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('auditoria');
            const result = await client.query(`
        SELECT 
          id,
          id_r_auditoria,
          hora,
          id_loja,
          data_auditoria,
          auditor,
          observacao,
          assinatura_func,
          tipo_auditoria,
          mes_ano,
          atendente,
          criado_em,
          atualizado_em
        FROM ${tableName}
        WHERE id = $1
      `, [id]);
            client.release();
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ [AuditoriaService] Erro ao buscar auditoria:', error);
            throw error;
        }
    }
    /** Buscar auditorias por loja */
    static async getAuditoriasByLoja(idLoja) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('auditoria');
            const result = await client.query(`
        SELECT 
          id,
          id_r_auditoria,
          hora,
          id_loja,
          data_auditoria,
          auditor,
          observacao,
          assinatura_func,
          tipo_auditoria,
          mes_ano,
          atendente,
          criado_em,
          atualizado_em
        FROM ${tableName}
        WHERE id_loja = $1
        ORDER BY data_auditoria DESC
      `, [idLoja]);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [AuditoriaService] Erro ao buscar auditorias por loja:', error);
            throw error;
        }
    }
    /** Buscar auditorias por data */
    static async getAuditoriasByDate(data) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('auditoria');
            const result = await client.query(`
        SELECT 
          id,
          id_r_auditoria,
          hora,
          id_loja,
          data_auditoria,
          auditor,
          observacao,
          assinatura_func,
          tipo_auditoria,
          mes_ano,
          atendente,
          criado_em,
          atualizado_em
        FROM ${tableName}
        WHERE DATE(data_auditoria) = $1
        ORDER BY hora DESC
      `, [data]);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [AuditoriaService] Erro ao buscar auditorias por data:', error);
            throw error;
        }
    }
    /** Criar nova auditoria */
    static async createAuditoria(auditoria) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('auditoria');
            const result = await client.query(`
        INSERT INTO ${tableName} (
          id, id_r_auditoria, hora, id_loja, data_auditoria,
          auditor, observacao, assinatura_func, tipo_auditoria,
          mes_ano, atendente
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
                auditoria.id, auditoria.id_r_auditoria, auditoria.hora, auditoria.id_loja,
                auditoria.data_auditoria, auditoria.auditor, auditoria.observacao,
                auditoria.assinatura_func, auditoria.tipo_auditoria, auditoria.mes_ano,
                auditoria.atendente
            ]);
            client.release();
            return result.rows[0];
        }
        catch (error) {
            console.error('❌ [AuditoriaService] Erro ao criar auditoria:', error);
            throw error;
        }
    }
    /** Atualizar auditoria */
    static async updateAuditoria(id, updates) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('auditoria');
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
            console.error('❌ [AuditoriaService] Erro ao atualizar auditoria:', error);
            throw error;
        }
    }
    /** Deletar auditoria */
    static async deleteAuditoria(id) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('auditoria');
            const result = await client.query(`
        DELETE FROM ${tableName}
        WHERE id = $1
      `, [id]);
            client.release();
            return result.rowCount > 0;
        }
        catch (error) {
            console.error('❌ [AuditoriaService] Erro ao deletar auditoria:', error);
            throw error;
        }
    }
}
exports.AuditoriaService = AuditoriaService;
/** Serviço Enterprise para Total (Auditoria do Dia) */
class TotalService {
    /** Buscar todos os totais */
    static async getTotais() {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('total');
            const result = await client.query(`
        SELECT 
          id,
          id_auditoria,
          id_loja,
          sistema,
          foto,
          valor,
          qtd_vendas,
          data_auditoria,
          d_auditada,
          d_auditoria_h,
          d_audit,
          email_auditor,
          nome_loja,
          nome_tipo,
          pagamento,
          foto2,
          foto3,
          img01,
          img02,
          img03,
          assinatura,
          nome_luc,
          mes_ano
        FROM ${tableName}
        ORDER BY data_auditoria DESC
      `);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [TotalService] Erro ao buscar totais:', error);
            throw error;
        }
    }
    /** Buscar totais por loja */
    static async getTotaisByLoja(idLoja) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('total');
            const result = await client.query(`
        SELECT 
          id,
          id_auditoria,
          id_loja,
          sistema,
          foto,
          valor,
          qtd_vendas,
          data_auditoria,
          d_auditada,
          d_auditoria_h,
          d_audit,
          email_auditor,
          nome_loja,
          nome_tipo,
          pagamento,
          foto2,
          foto3,
          img01,
          img02,
          img03,
          assinatura,
          nome_luc,
          mes_ano
        FROM ${tableName}
        WHERE id_loja = $1
        ORDER BY data_auditoria DESC
      `, [idLoja]);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [TotalService] Erro ao buscar totais por loja:', error);
            throw error;
        }
    }
    /** Buscar totais por data */
    static async getTotaisByDate(data) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('total');
            const result = await client.query(`
        SELECT 
          id,
          id_auditoria,
          id_loja,
          sistema,
          foto,
          valor,
          qtd_vendas,
          data_auditoria,
          d_auditada,
          d_auditoria_h,
          d_audit,
          email_auditor,
          nome_loja,
          nome_tipo,
          pagamento,
          foto2,
          foto3,
          img01,
          img02,
          img03,
          assinatura,
          nome_luc,
          mes_ano
        FROM ${tableName}
        WHERE DATE(data_auditoria) = $1
        ORDER BY d_auditoria_h DESC
      `, [data]);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [TotalService] Erro ao buscar totais por data:', error);
            throw error;
        }
    }
    /** Buscar totais por loja e/ou auditoria */
    static async getTotalAuditoria(idLoja, idAuditoria) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('total');
            let query = `
        SELECT 
          id,
          id_auditoria,
          id_loja,
          sistema,
          foto,
          valor,
          qtd_vendas,
          data_auditoria,
          d_auditada,
          d_auditoria_h,
          d_audit,
          email_auditor,
          nome_loja,
          nome_tipo,
          pagamento,
          foto2,
          foto3,
          img01,
          img02,
          img03,
          assinatura,
          nome_luc,
          mes_ano
        FROM ${tableName}
        WHERE 1=1
      `;
            const params = [];
            let paramIndex = 1;
            if (idLoja) {
                query += ` AND id_loja = $${paramIndex}`;
                params.push(idLoja);
                paramIndex++;
            }
            if (idAuditoria) {
                query += ` AND id_auditoria = $${paramIndex}`;
                params.push(idAuditoria);
            }
            query += ` ORDER BY data_auditoria DESC`;
            const result = await client.query(query, params);
            client.release();
            return result.rows;
        }
        catch (error) {
            console.error('❌ [TotalService] Erro ao buscar totais por auditoria:', error);
            throw error;
        }
    }
    /** Criar novo total */
    static async createTotal(total, schema) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('total', schema);
            const result = await client.query(`
        INSERT INTO ${tableName} (
          id_auditoria, id_loja, sistema, foto, valor, qtd_vendas,
          data_auditoria, d_auditada, d_auditoria_h, d_audit, email_auditor,
          nome_loja, nome_tipo, pagamento, foto2, foto3, img01, img02, img03,
          assinatura, nome_luc, mes_ano
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *
      `, [
                total.id_auditoria, total.id_loja, total.sistema, total.foto,
                total.valor, total.qtd_vendas, total.data_auditoria, total.d_auditada,
                total.d_auditoria_h, total.d_audit, total.email_auditor, total.nome_loja,
                total.nome_tipo, total.pagamento, total.foto2, total.foto3, total.img01,
                total.img02, total.img03, total.assinatura, total.nome_luc, total.mes_ano
            ]);
            client.release();
            return result.rows[0];
        }
        catch (error) {
            console.error('❌ [TotalService] Erro ao criar total:', error);
            throw error;
        }
    }
    /** Atualizar total */
    static async updateTotal(id, updates) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('total');
            const setClause = Object.keys(updates)
                .filter(key => key !== 'id')
                .map((key, index) => `${key} = $${index + 2}`)
                .join(', ');
            const values = [id, ...Object.values(updates).filter((_, index) => Object.keys(updates)[index] !== 'id')];
            const result = await client.query(`
        UPDATE ${tableName}
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `, values);
            client.release();
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ [TotalService] Erro ao atualizar total:', error);
            throw error;
        }
    }
    /** Deletar total */
    static async deleteTotal(id) {
        try {
            const client = await db_postgres_1.pool.connect();
            const tableName = (0, db_postgres_1.getTableName)('total');
            const result = await client.query(`
        DELETE FROM ${tableName}
        WHERE id = $1
      `, [id]);
            client.release();
            return result.rowCount > 0;
        }
        catch (error) {
            console.error('❌ [TotalService] Erro ao deletar total:', error);
            throw error;
        }
    }
}
exports.TotalService = TotalService;
// ✅ EXPORTAR FUNÇÕES
exports.auditoriaService = new AuditoriaService();
exports.totalService = new TotalService();
async function getAuditoriasData(idRoteiro) {
    return AuditoriaService.getAuditorias(idRoteiro);
}
async function getTotalAuditoriaData(idLoja, idAuditoria) {
    return TotalService.getTotalAuditoria(idLoja, idAuditoria);
}
