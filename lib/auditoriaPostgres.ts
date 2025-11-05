// lib/auditoriaPostgres.ts - ENTERPRISE POSTGRESQL AUDITORIA
import { pool, getTableName } from './db-postgres';

/** Interface para Auditoria */
export interface Auditoria {
  id: string;
  id_r_auditoria: string;
  hora: string;
  id_loja: string;
  data_auditoria: Date;
  auditor: string;
  observacao: string;
  assinatura_func: string;
  tipo_auditoria: string;
  mes_ano: string;
  atendente: string;
  criado_em: Date;
  atualizado_em: Date;
  nome_loja?: string;
  img_loja?: string;
  segmentos?: string;
  tipos_dispositivos?: string;
}

/** Interface para Total (Auditoria do Dia) */
export interface Total {
  id: string;
  id_auditoria: string;
  id_loja: string;
  sistema: string;
  foto: string;
  valor: number;
  qtd_vendas: number;
  data_auditoria: Date;
  d_auditada: Date;
  d_auditoria_h: string;
  d_audit: Date;
  email_auditor: string;
  nome_loja: string;
  nome_tipo: string;
  pagamento: string;
  foto2: string;
  foto3: string;
  img01: string;
  img02: string;
  img03: string;
  assinatura: string;
  nome_luc: string;
  mes_ano: string;
}

/** Serviço Enterprise para Auditoria */
export class AuditoriaService {
  
  /** Buscar todas as auditorias */
  static async getAuditorias(idRoteiro?: string): Promise<Auditoria[]> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('auditoria');
      
      const lojasTableName = getTableName('lojas');
      
      const mapeamentosTableName = getTableName('mapeamentos');
      
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
      
      const params: string[] = [];
      if (idRoteiro) {
        query += ` WHERE id_r_auditoria = $1`;
        params.push(idRoteiro);
      }
      
      query += ` GROUP BY a.id, a.id_r_auditoria, a.hora, a.id_loja, a.data_auditoria, a.auditor, a.observacao, a.assinatura_func, a.tipo_auditoria, a.mes_ano, a.atendente, a.criado_em, a.atualizado_em, l.nome_loja, l.luc_box, l.img_loja, l.segmentos`;
      query += ` ORDER BY a.data_auditoria DESC, a.criado_em DESC`;
      
      const result = await client.query(query, params);
      
      client.release();
      return result.rows;
    } catch (error) {
      console.error('❌ [AuditoriaService] Erro ao buscar auditorias:', error);
      throw error;
    }
  }

  /** Buscar auditoria por ID */
  static async getAuditoriaById(id: string): Promise<Auditoria | null> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('auditoria');
      
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
    } catch (error) {
      console.error('❌ [AuditoriaService] Erro ao buscar auditoria:', error);
      throw error;
    }
  }

  /** Buscar auditorias por loja */
  static async getAuditoriasByLoja(idLoja: string): Promise<Auditoria[]> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('auditoria');
      
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
    } catch (error) {
      console.error('❌ [AuditoriaService] Erro ao buscar auditorias por loja:', error);
      throw error;
    }
  }

  /** Buscar auditorias por data */
  static async getAuditoriasByDate(data: string): Promise<Auditoria[]> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('auditoria');
      
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
    } catch (error) {
      console.error('❌ [AuditoriaService] Erro ao buscar auditorias por data:', error);
      throw error;
    }
  }

  /** Criar nova auditoria */
  static async createAuditoria(auditoria: Omit<Auditoria, 'criado_em' | 'atualizado_em'>): Promise<Auditoria> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('auditoria');
      
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
    } catch (error) {
      console.error('❌ [AuditoriaService] Erro ao criar auditoria:', error);
      throw error;
    }
  }

  /** Atualizar auditoria */
  static async updateAuditoria(id: string, updates: Partial<Auditoria>): Promise<Auditoria | null> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('auditoria');
      
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'criado_em')
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const values = [id, ...Object.values(updates).filter((_, index) => 
        Object.keys(updates)[index] !== 'id' && Object.keys(updates)[index] !== 'criado_em'
      )];
      
      const result = await client.query(`
        UPDATE ${tableName}
        SET ${setClause}, atualizado_em = NOW()
        WHERE id = $1
        RETURNING *
      `, values);
      
      client.release();
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ [AuditoriaService] Erro ao atualizar auditoria:', error);
      throw error;
    }
  }

  /** Deletar auditoria */
  static async deleteAuditoria(id: string): Promise<boolean> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('auditoria');
      
      const result = await client.query(`
        DELETE FROM ${tableName}
        WHERE id = $1
      `, [id]);
      
      client.release();
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ [AuditoriaService] Erro ao deletar auditoria:', error);
      throw error;
    }
  }
}

/** Serviço Enterprise para Total (Auditoria do Dia) */
export class TotalService {
  
  /** Buscar todos os totais */
  static async getTotais(): Promise<Total[]> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('total');
      
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
    } catch (error) {
      console.error('❌ [TotalService] Erro ao buscar totais:', error);
      throw error;
    }
  }

  /** Buscar totais por loja */
  static async getTotaisByLoja(idLoja: string): Promise<Total[]> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('total');
      
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
    } catch (error) {
      console.error('❌ [TotalService] Erro ao buscar totais por loja:', error);
      throw error;
    }
  }

  /** Buscar totais por data */
  static async getTotaisByDate(data: string): Promise<Total[]> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('total');
      
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
    } catch (error) {
      console.error('❌ [TotalService] Erro ao buscar totais por data:', error);
      throw error;
    }
  }

  /** Buscar totais por loja e/ou auditoria */
  static async getTotalAuditoria(idLoja?: string, idAuditoria?: string): Promise<Total[]> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('total');
      
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
      
      const params: any[] = [];
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
    } catch (error) {
      console.error('❌ [TotalService] Erro ao buscar totais por auditoria:', error);
      throw error;
    }
  }

  /** Criar novo total */
  static async createTotal(total: Omit<Total, 'id'>): Promise<Total> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('total');
      
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
    } catch (error) {
      console.error('❌ [TotalService] Erro ao criar total:', error);
      throw error;
    }
  }

  /** Atualizar total */
  static async updateTotal(id: string, updates: Partial<Total>): Promise<Total | null> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('total');
      
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id')
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const values = [id, ...Object.values(updates).filter((_, index) => 
        Object.keys(updates)[index] !== 'id'
      )];
      
      const result = await client.query(`
        UPDATE ${tableName}
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `, values);
      
      client.release();
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ [TotalService] Erro ao atualizar total:', error);
      throw error;
    }
  }

  /** Deletar total */
  static async deleteTotal(id: string): Promise<boolean> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('total');
      
      const result = await client.query(`
        DELETE FROM ${tableName}
        WHERE id = $1
      `, [id]);
      
      client.release();
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ [TotalService] Erro ao deletar total:', error);
      throw error;
    }
  }
}

// ✅ EXPORTAR FUNÇÕES
export const auditoriaService = new AuditoriaService();
export const totalService = new TotalService();

export async function getAuditoriasData(idRoteiro?: string): Promise<Auditoria[]> {
  return AuditoriaService.getAuditorias(idRoteiro);
}

export async function getTotalAuditoriaData(idLoja?: string, idAuditoria?: string): Promise<Total[]> {
  return TotalService.getTotalAuditoria(idLoja, idAuditoria);
}
