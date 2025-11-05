// lib/roteiroPostgres.ts - ENTERPRISE POSTGRESQL ROTEIROS
import { pool, getTableName } from './db-postgres';

/** Interfaces para Roteiros */
export interface Roteiro {
  id_roteiro: string;
  roteiro: string;
  status: string;
  descricao?: string;
  created_at?: Date;
}

export interface CadastroAuditoria {
  id: string;
  id_roteiro: string;
  id_loja: string;
  status: string;
  created_at?: Date;
}

export interface Usuario {
  id_user: number;
  nome_user: string;
  email_user: string;
  permissao: string;
  status: string;
  username: string;
  password: string;
}

/** Serviço Enterprise para Roteiros */
export class RoteiroService {
  
  /** Buscar todos os roteiros */
  static async getRoteiros(schema?: string): Promise<Roteiro[]> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('roteiros', schema);
      
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
    } catch (error) {
      console.error('❌ [RoteiroService] Erro ao buscar roteiros:', error);
      throw error;
    }
  }

  /** Buscar roteiro por ID */
  static async getRoteiroById(idRoteiro: string): Promise<Roteiro | null> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('roteiros');
      
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
    } catch (error) {
      console.error('❌ [RoteiroService] Erro ao buscar roteiro:', error);
      throw error;
    }
  }

  /** Criar novo roteiro */
  static async createRoteiro(roteiro: Omit<Roteiro, 'created_at'>): Promise<Roteiro> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('roteiros');
      
      const result = await client.query(`
        INSERT INTO ${tableName} (id_roteiro, roteiro, status, descricao)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [roteiro.id_roteiro, roteiro.roteiro, roteiro.status, roteiro.descricao]);
      
      client.release();
      return result.rows[0];
    } catch (error) {
      console.error('❌ [RoteiroService] Erro ao criar roteiro:', error);
      throw error;
    }
  }

  /** Atualizar roteiro */
  static async updateRoteiro(idRoteiro: string, updates: Partial<Roteiro>): Promise<Roteiro | null> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('roteiros');
      
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id_roteiro' && key !== 'created_at')
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const values = [idRoteiro, ...Object.values(updates).filter((_, index) => 
        Object.keys(updates)[index] !== 'id_roteiro' && Object.keys(updates)[index] !== 'created_at'
      )];
      
      const result = await client.query(`
        UPDATE ${tableName}
        SET ${setClause}, atualizado_em = NOW()
        WHERE id_roteiro = $1
        RETURNING *
      `, values);
      
      client.release();
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ [RoteiroService] Erro ao atualizar roteiro:', error);
      throw error;
    }
  }

  /** Deletar roteiro */
  static async deleteRoteiro(idRoteiro: string): Promise<boolean> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('roteiros');
      
      const result = await client.query(`
        DELETE FROM ${tableName}
        WHERE id_roteiro = $1
      `, [idRoteiro]);
      
      client.release();
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ [RoteiroService] Erro ao deletar roteiro:', error);
      throw error;
    }
  }
}

/** Serviço Enterprise para Cadastro de Auditoria */
export class CadastroAuditoriaService {
  
  /** Buscar cadastros com dados da loja */
  static async getCadastrosWithLoja(schema?: string): Promise<any[]> {
    try {
      const client = await pool.connect();
      const cadastroTable = getTableName('cadastro', schema);
      const lojaTable = getTableName('lojas', schema);
      
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
    } catch (error) {
      console.error('❌ [CadastroAuditoriaService] Erro ao buscar cadastros:', error);
      throw error;
    }
  }

  /** Criar novo cadastro */
  static async createCadastro(cadastro: Omit<CadastroAuditoria, 'created_at'>): Promise<CadastroAuditoria> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('cadastro');
      
      const result = await client.query(`
        INSERT INTO ${tableName} (id, id_roteiro, id_loja, status)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [cadastro.id, cadastro.id_roteiro, cadastro.id_loja, cadastro.status]);
      
      client.release();
      return result.rows[0];
    } catch (error) {
      console.error('❌ [CadastroAuditoriaService] Erro ao criar cadastro:', error);
      throw error;
    }
  }
}

/** Serviço Enterprise para Usuários */
export class UsuarioService {
  
  /** Buscar todos os usuários */
  static async getUsuarios(): Promise<Usuario[]> {
    try {
      const client = await pool.connect();
      const tableName = getTableName('usuarios');
      
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
    } catch (error) {
      console.error('❌ [UsuarioService] Erro ao buscar usuários:', error);
      throw error;
    }
  }
}

/** Funções principais para compatibilidade com lib/roteiroSheets.ts */
export async function getRoteiroData(schema?: string): Promise<Roteiro[]> {
  return await RoteiroService.getRoteiros(schema);
}

export async function getCadastroAuditoriaDataWithLoja(schema?: string): Promise<any[]> {
  return await CadastroAuditoriaService.getCadastrosWithLoja(schema);
}

export async function getUsuarioData(): Promise<Usuario[]> {
  return await UsuarioService.getUsuarios();
}

