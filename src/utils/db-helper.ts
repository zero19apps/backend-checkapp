// src/utils/db-helper.ts
// ✅ Helper para importar libs PostgreSQL do projeto standalone

import path from 'path';

// ✅ Caminho para as libs (mesmo nível do src)
const PROJECT_ROOT = path.join(__dirname, '../../');

// ✅ Função para importar módulos locais
export function importProjectModule(modulePath: string) {
  try {
    const fullPath = path.join(PROJECT_ROOT, modulePath);
    return require(fullPath);
  } catch (error) {
    console.error(`❌ [DB-HELPER] Erro ao importar ${modulePath}:`, error);
    throw error;
  }
}

// ✅ Exportar helpers de DB com schema dinâmico
export async function getRoteiroData(schema?: string) {
  const { getRoteiroData } = importProjectModule('lib/roteiroPostgres');
  return getRoteiroData(schema);
}

export async function getCadastroAuditoriaDataWithLoja(schema?: string) {
  const { getCadastroAuditoriaDataWithLoja } = importProjectModule('lib/roteiroPostgres');
  return getCadastroAuditoriaDataWithLoja(schema);
}

export async function getLojaData(schema?: string) {
  const { getLojaData } = importProjectModule('lib/lojaPostgres');
  return getLojaData(schema);
}

// ✅ Pool de conexão PostgreSQL
export function getPool() {
  const { pool } = importProjectModule('lib/db-postgres');
  return pool;
}

export function getTableName(table: string, schema?: string) {
  const { getTableName } = importProjectModule('lib/db-postgres');
  return getTableName(table, schema);
}

