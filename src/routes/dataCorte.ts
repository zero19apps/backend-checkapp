// backend-checkapp/src/routes/dataCorte.ts
import { Router } from 'express';
import { getPool, getTableName } from '../utils/db-helper';

const router = Router();

// GET /api/data-corte/get-all-psql
router.get('/get-all-psql', async (req, res) => {
  try {
    // 🔒 SEGURANÇA: Schema DEVE vir do middleware - sem fallback
    const schema = req.schema;
    if (!schema) {
      console.error('❌ [BACKEND-data-corte] Schema não encontrado na requisição');
      return res.status(403).json({ 
        error: 'Schema não encontrado',
        message: 'O schema necessário para acessar os dados não foi fornecido.'
      });
    }
    console.log("🚀 [BACKEND-data-corte] Buscando data_corte via PostgreSQL | Schema:", schema);
    
    const pool = getPool();
    const tableName = getTableName('data_corte', schema);
    
    const result = await pool.query(`
      SELECT *
      FROM ${tableName}
      ORDER BY created_at DESC NULLS LAST
    `);
    
    const dataCorte = result.rows;
    
    console.log("✅ [BACKEND-data-corte] data_corte encontradas:", dataCorte.length);

    res.status(200).json({
      success: true,
      dataCorteData: dataCorte,
      dataCorte: dataCorte, // Compatibilidade
      count: dataCorte.length
    });
  } catch (error: any) {
    console.error("❌ [BACKEND-data-corte] Erro:", error);
    res.status(500).json({ 
      error: "Erro ao buscar data_corte",
      details: {
        name: error.name,
        message: error.message,
      }
    });
  }
});

// GET /api/data-corte/get-by-id/:id
router.get('/get-by-id/:id', async (req, res) => {
  try {
    // 🔒 SEGURANÇA: Schema DEVE vir do middleware - sem fallback
    const schema = req.schema;
    if (!schema) {
      console.error('❌ [BACKEND-data-corte-get-by-id] Schema não encontrado na requisição');
      return res.status(403).json({ 
        error: 'Schema não encontrado',
        message: 'O schema necessário para acessar os dados não foi fornecido.'
      });
    }
    const { id } = req.params;
    
    const pool = getPool();
    const tableName = getTableName('data_corte', schema);
    
    const result = await pool.query(`
      SELECT *
      FROM ${tableName}
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "data_corte não encontrada"
      });
    }
    
    res.status(200).json({
      success: true,
      dataCorte: result.rows[0]
    });
  } catch (error: any) {
    console.error("❌ [BACKEND-data-corte-get-by-id] Erro:", error);
    res.status(500).json({ 
      error: "Erro ao buscar data_corte",
      details: error.message
    });
  }
});

export default router;


