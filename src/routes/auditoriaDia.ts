// backend/src/routes/auditoriaDia.ts
import { Router } from 'express';
import { getPool, getTableName } from '../utils/db-helper';

const router = Router();

// GET /api/auditoriaDia/get-all-total-psql
router.get('/get-all-total-psql', async (req, res) => {
  try {
    const schema = req.schema; // Schema extraído do JWT pelo middleware
    const pool = getPool();
    const totalTableName = getTableName('total', schema);

    const client = await pool.connect();
    try {
      // Buscar dados dos últimos 60 dias (otimizado)
      const query = `
        SELECT *
        FROM ${totalTableName}
        WHERE d_auditada >= CURRENT_DATE - INTERVAL '60 days'
        ORDER BY d_auditada DESC, id DESC
      `;

      const result = await client.query(query);
      
      console.log(`✅ [BACKEND-get-all-total-psql] Dados encontrados: ${result.rows.length}`);
      
      res.status(200).json({
        success: true,
        totalData: result.rows,
        count: result.rows.length
      });
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ [BACKEND-get-all-total-psql] Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar dados', 
      details: error.message 
    });
  }
});

// POST /api/auditoriaDia/add-Dia-psql
router.post('/add-Dia-psql', async (req, res) => {
  try {
    // Implementar conforme necessário
    res.status(200).json({ message: 'Not implemented yet' });
  } catch (error: any) {
    console.error('❌ [BACKEND-add-Dia-psql] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auditoriaDia/get-total-psql
router.get('/get-total-psql', async (req, res) => {
  try {
    const schema = req.schema; // Schema extraído do JWT pelo middleware
    const { idLoja, idAuditoria } = req.query;
    const pool = getPool();
    const totalTableName = getTableName('total', schema);

    const client = await pool.connect();
    try {
      let query = `SELECT * FROM ${totalTableName}`;
      const params: any[] = [];
      
      if (idLoja && idAuditoria) {
        query += ` WHERE id_loja = $1 AND id_auditoria = $2`;
        params.push(idLoja, idAuditoria);
      } else if (idLoja) {
        query += ` WHERE id_loja = $1`;
        params.push(idLoja);
      }
      
      query += ` ORDER BY d_auditada DESC`;

      const result = await client.query(query, params);
      
      res.status(200).json({
        success: true,
        totalData: result.rows,
        count: result.rows.length
      });
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ [BACKEND-get-total-psql] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auditoriaDia/update-valor
router.put('/update-valor', async (req, res) => {
  try {
    // Implementar conforme necessário
    res.status(200).json({ message: 'Not implemented yet' });
  } catch (error: any) {
    console.error('❌ [BACKEND-update-valor] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

