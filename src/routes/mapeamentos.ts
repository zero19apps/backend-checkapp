// backend/src/routes/mapeamentos.ts
import { Router } from 'express';
import { getPool, getTableName } from '../utils/db-helper';

const router = Router();

// GET /api/mapeamentos/get-all-psql
router.get('/get-all-psql', async (req, res) => {
  try {
    const schema = req.schema; // Schema extraído do JWT pelo middleware
    const pool = getPool();
    const mapeamentosTableName = getTableName('mapeamentos', schema);
    const lojasTableName = getTableName('lojas', schema);

    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          m.id,
          m.id_loja,
          m.sistema,
          m.tipo,
          m.nserie,
          m.status,
          m.relatorio,
          m.possui_tef,
          m.foto,
          m.observacao,
          m.dcriacao,
          m.prioridade,
          m.criado_em,
          m.atualizado_em,
          l.nome_loja
        FROM ${mapeamentosTableName} m
        LEFT JOIN ${lojasTableName} l ON m.id_loja = l.id_loja
        WHERE m.status = 'ATIVO'
        ORDER BY m.criado_em ASC, m.id ASC
      `;

      const result = await client.query(query);
      
      res.status(200).json({
        success: true,
        mapeamentosData: result.rows,
        count: result.rows.length
      });
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ [BACKEND-get-all-psql] Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar mapeamentos', 
      details: error.message 
    });
  }
});

// GET /api/mapeamentos/:idLoja
router.get('/:idLoja', async (req, res) => {
  try {
    // Implementar conforme necessário
    res.status(200).json({ message: 'Not implemented yet' });
  } catch (error: any) {
    console.error('❌ [BACKEND-mapeamentos-idLoja] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mapeamentos/add-mapeamento-psql
router.post('/add-mapeamento-psql', async (req, res) => {
  try {
    // Implementar conforme necessário
    res.status(200).json({ message: 'Not implemented yet' });
  } catch (error: any) {
    console.error('❌ [BACKEND-add-mapeamento-psql] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

