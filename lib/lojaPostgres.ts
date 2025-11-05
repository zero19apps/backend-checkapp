// lib/lojaPostgres.ts - ENTERPRISE POSTGRESQL LOJAS
import { pool, getTableName } from './db-postgres';

/** Interface para Loja */
export interface Loja {
  id_loja: string;
  nome_loja: string;
  luc_box: string;
  metragem: number;
  piso: string;
  corredor: string;
  classificacao: string;
  categoria: string;
  segmentos: string;
  status: string;
  img_loja: string;
  valor_contrato: number;
  percentual: number;
  nome_luc: string;
  contrato: string;
}

/** Serviço Enterprise para Lojas */
export class LojaService {
  
  /** Buscar todas as lojas */
  static async getLojas(schema?: string): Promise<Loja[]> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('lojas', schema);
      
      const result = await client.query(`
        SELECT 
          id_loja,
          nome_loja,
          luc_box,
          metragem,
          piso,
          corredor,
          classificacao,
          categoria,
          segmentos,
          status,
          img_loja,
          valor_contrato,
          percentual,
          nome_luc,
          contrato
        FROM ${tableName}
        ORDER BY nome_loja
      `);
      
      client.release();
      return result.rows;
    } catch (error) {
      console.error('❌ [LojaService] Erro ao buscar lojas:', error);
      throw error;
    }
  }

  /** Buscar loja por ID */
  static async getLojaById(idLoja: string): Promise<Loja | null> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('lojas');
      
      const result = await client.query(`
        SELECT 
          id_loja,
          nome_loja,
          luc_box,
          metragem,
          piso,
          corredor,
          classificacao,
          categoria,
          segmentos,
          status,
          img_loja,
          valor_contrato,
          percentual,
          nome_luc,
          contrato
        FROM ${tableName}
        WHERE id_loja = $1
      `, [idLoja]);
      
      client.release();
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ [LojaService] Erro ao buscar loja:', error);
      throw error;
    }
  }

  /** Buscar lojas por segmento */
  static async getLojasBySegmento(segmento: string): Promise<Loja[]> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('lojas');
      
      const result = await client.query(`
        SELECT 
          id_loja,
          nome_loja,
          luc_box,
          metragem,
          piso,
          corredor,
          classificacao,
          categoria,
          segmentos,
          status,
          img_loja,
          valor_contrato,
          percentual,
          nome_luc,
          contrato
        FROM ${tableName}
        WHERE segmentos ILIKE $1
        ORDER BY nome_loja
      `, [`%${segmento}%`]);
      
      client.release();
      return result.rows;
    } catch (error) {
      console.error('❌ [LojaService] Erro ao buscar lojas por segmento:', error);
      throw error;
    }
  }

  /** Buscar lojas ativas */
  static async getLojasAtivas(): Promise<Loja[]> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('lojas');
      
      const result = await client.query(`
        SELECT 
          id_loja,
          nome_loja,
          luc_box,
          metragem,
          piso,
          corredor,
          classificacao,
          categoria,
          segmentos,
          status,
          img_loja,
          valor_contrato,
          percentual,
          nome_luc,
          contrato
        FROM ${tableName}
        WHERE status = 'ATIVO'
        ORDER BY nome_loja
      `);
      
      client.release();
      return result.rows;
    } catch (error) {
      console.error('❌ [LojaService] Erro ao buscar lojas ativas:', error);
      throw error;
    }
  }

  /** Criar nova loja */
  static async createLoja(loja: Omit<Loja, 'id_loja'>): Promise<Loja> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('lojas');
      
      const result = await client.query(`
        INSERT INTO ${tableName} (
          id_loja, nome_loja, luc_box, metragem, piso, corredor,
          classificacao, categoria, segmentos, status, img_loja,
          valor_contrato, percentual, nome_luc, contrato
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        loja.id_loja, loja.nome_loja, loja.luc_box, loja.metragem, loja.piso, loja.corredor,
        loja.classificacao, loja.categoria, loja.segmentos, loja.status, loja.img_loja,
        loja.valor_contrato, loja.percentual, loja.nome_luc, loja.contrato
      ]);
      
      client.release();
      return result.rows[0];
    } catch (error) {
      console.error('❌ [LojaService] Erro ao criar loja:', error);
      throw error;
    }
  }

  /** Atualizar loja */
  static async updateLoja(idLoja: string, updates: Partial<Loja>): Promise<Loja | null> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('lojas');
      
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id_loja')
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const values = [idLoja, ...Object.values(updates).filter((_, index) => 
        Object.keys(updates)[index] !== 'id_loja'
      )];
      
      const result = await client.query(`
        UPDATE ${tableName}
        SET ${setClause}
        WHERE id_loja = $1
        RETURNING *
      `, values);
      
      client.release();
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ [LojaService] Erro ao atualizar loja:', error);
      throw error;
    }
  }

  /** Deletar loja */
  static async deleteLoja(idLoja: string): Promise<boolean> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('lojas');
      
      const result = await client.query(`
        DELETE FROM ${tableName}
        WHERE id_loja = $1
      `, [idLoja]);
      
      client.release();
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ [LojaService] Erro ao deletar loja:', error);
      throw error;
    }
  }
}

/** Função principal para compatibilidade com lib/roteiroSheets.ts */
export async function getLojaData(schema?: string): Promise<Loja[]> {
  return await LojaService.getLojas(schema);
}

