// backend/src/routes/auditoria.ts
import { Router } from 'express';
import { getPool, getTableName } from '../utils/db-helper';

const router = Router();

// GET /api/auditoria/get-auditorias-detalhes-psql
router.get('/get-auditorias-detalhes-psql', async (req, res) => {
  try {
    const schema = req.schema; // Schema extraído do JWT pelo middleware
    const pool = getPool();
    const auditoriaTableName = getTableName('auditoria', schema);

    const client = await pool.connect();
    try {
      console.log("🚀 [BACKEND-get-auditorias-detalhes-psql] Buscando dados detalhados da tabela auditoria (apenas hoje)");
      
      const query = `
        SELECT *
        FROM ${auditoriaTableName}
        WHERE data_auditoria >= CURRENT_DATE
        ORDER BY data_auditoria DESC, criado_em DESC
      `;

      const result = await client.query(query);
      
      console.log(`✅ [BACKEND-get-auditorias-detalhes-psql] Dados encontrados: ${result.rows.length}`);
      
      res.status(200).json({
        success: true,
        auditoriasData: result.rows,
        auditorias: result.rows, // Compatibilidade
        count: result.rows.length
      });
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ [BACKEND-get-auditorias-detalhes-psql] Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar auditorias', 
      details: error.message 
    });
  }
});

export default router;

