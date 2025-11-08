// lib/funcionarioPostgres.ts - ENTERPRISE POSTGRESQL FUNCIONÁRIOS
import { randomUUID } from 'crypto';
import { pool, getTableName } from './db-postgres';

export interface Funcionario {
  id: string;
  id_loja: string | null;
  nome_loja: string | null;
  nome_funcionario: string | null;
  status: number | boolean | null;
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface CreateFuncionarioInput {
  id?: string;
  id_loja: string;
  nome_loja?: string | null;
  nome_funcionario: string;
  status?: boolean | number | string;
}

export interface UpdateFuncionarioStatusInput {
  status: boolean | number | string;
}

function normalizeStatus(status?: boolean | number | string): number {
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

export async function getFuncionarios(schema?: string): Promise<Funcionario[]> {
  const client = await pool.connect();
  try {
    const tableName = getTableName('funcionarios', schema);
    const result = await client.query<Funcionario>(
      `
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
      `
    );

    return result.rows;
  } finally {
    client.release();
  }
}

export async function createFuncionario(
  payload: CreateFuncionarioInput,
  schema?: string
): Promise<Funcionario> {
  const client = await pool.connect();
  try {
    const tableName = getTableName('funcionarios', schema);
    const id = payload.id ?? randomUUID();
    const statusValue = normalizeStatus(payload.status);

    const result = await client.query<Funcionario>(
      `
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
      `,
      [
        id,
        payload.id_loja,
        payload.nome_loja ?? null,
        payload.nome_funcionario,
        statusValue,
      ]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function updateFuncionarioStatus(
  id: string,
  status: UpdateFuncionarioStatusInput['status'],
  schema?: string
): Promise<Funcionario> {
  const client = await pool.connect();
  try {
    const tableName = getTableName('funcionarios', schema);
    const statusValue = normalizeStatus(status);

    const result = await client.query<Funcionario>(
      `
        UPDATE ${tableName}
           SET status = $1,
               atualizado_em = NOW()
         WHERE id = $2
        RETURNING *
      `,
      [statusValue, id]
    );

    if (result.rowCount === 0) {
      throw new Error('Funcionário não encontrado');
    }

    return result.rows[0];
  } finally {
    client.release();
  }
}


