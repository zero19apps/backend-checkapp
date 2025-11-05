// backend/src/routes/roteiro.ts
import { Router } from 'express';
import { getRoteiroData, getCadastroAuditoriaDataWithLoja } from '../utils/db-helper';

const router = Router();

// GET /api/roteiro/roteiros-psql
router.get('/roteiros-psql', async (req, res) => {
  try {
    const schema = req.schema; // Schema extraído do JWT pelo middleware
    console.log("🚀 [BACKEND-roteiros-psql] Iniciando busca de dados via PostgreSQL | Schema:", schema);
    
    const [roteirosData, cadastroData] = await Promise.all([
      getRoteiroData(schema),
      getCadastroAuditoriaDataWithLoja(schema),
    ]);

    console.log("✅ [BACKEND-roteiros-psql] Dados recuperados:", {
      roteirosCount: roteirosData?.length,
      cadastroCount: cadastroData?.length
    });

    if (!roteirosData || !Array.isArray(roteirosData)) {
      return res.status(400).json({ 
        error: "Dados de roteiros inválidos",
        details: null 
      });
    }

    res.status(200).json({ 
      roteirosData, 
      cadastroData 
    });
  } catch (error: any) {
    console.error("❌ [BACKEND-roteiros-psql] Erro:", error);
    res.status(500).json({ 
      error: "Erro ao buscar dados",
      details: {
        name: error.name,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      }
    });
  }
});

// GET /api/roteiro/get-auditoria-psql
router.get('/get-auditoria-psql', async (req, res) => {
  try {
    // Implementar conforme necessário
    res.status(200).json({ message: 'Not implemented yet' });
  } catch (error: any) {
    console.error("❌ [BACKEND-get-auditoria-psql] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

