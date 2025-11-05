// backend/src/routes/lojas.ts
import { Router } from 'express';
import { getLojaData, getPool, getTableName } from '../utils/db-helper';

const router = Router();

// GET /api/lojas/get-lojas-psql
router.get('/get-lojas-psql', async (req, res) => {
  try {
    const schema = req.schema; // Schema extraído do JWT pelo middleware
    console.log("🚀 [BACKEND-get-lojas-psql] Buscando lojas via PostgreSQL | Schema:", schema);
    
    const lojas = await getLojaData(schema);
    
    console.log("✅ [BACKEND-get-lojas-psql] Lojas encontradas:", lojas.length);

    const lojasFormatted = lojas.map((loja: any) => ({
      ID_LOJA: loja.id_loja,
      NOME_LOJA: loja.nome_loja,
      LUC: loja.luc_box,
      METRAGEM: loja.metragem,
      PISO: loja.piso,
      CORREDOR: loja.corredor,
      CLASSIFICACAO: loja.classificacao,
      CATEGORIA: loja.categoria,
      SEGMENTOS: loja.segmentos,
      STATUS: loja.status,
      IMG_LOJA: loja.img_loja,
      VALOR_CONTRATO: loja.valor_contrato,
      PERCENTUAL: loja.percentual,
      NOME_LUC: loja.nome_luc,
      CONTRATO: loja.contrato
    }));

    res.status(200).json({
      lojasData: lojasFormatted,
      lojas: lojasFormatted, // Compatibilidade
      total: lojasFormatted.length
    });
  } catch (error: any) {
    console.error("❌ [BACKEND-get-lojas-psql] Erro:", error);
    res.status(500).json({ 
      error: "Erro ao buscar lojas",
      details: {
        name: error.name,
        message: error.message,
      }
    });
  }
});

// GET /api/lojas/get-loja-psql
router.get('/get-loja-psql', async (req, res) => {
  try {
    const schema = req.schema; // Schema extraído do JWT pelo middleware
    console.log("🚀 [BACKEND-get-loja-psql] Buscando lojas via PostgreSQL | Schema:", schema);
    
    const lojas = await getLojaData(schema);
    
    const lojasFormatted = lojas.map((loja: any) => ({
      ID_LOJA: loja.id_loja,
      NOME_LOJA: loja.nome_loja,
      LUC: loja.luc_box,
      METRAGEM: loja.metragem,
      PISO: loja.piso,
      CORREDOR: loja.corredor,
      CLASSIFICACAO: loja.classificacao,
      CATEGORIA: loja.categoria,
      SEGMENTOS: loja.segmentos,
      STATUS: loja.status,
      IMG_LOJA: loja.img_loja,
      VALOR_CONTRATO: loja.valor_contrato,
      PERCENTUAL: loja.percentual,
      NOME_LUC: loja.nome_luc,
      CONTRATO: loja.contrato
    }));

    res.status(200).json({
      lojas: lojasFormatted,
      total: lojasFormatted.length
    });
  } catch (error: any) {
    console.error("❌ [BACKEND-get-loja-psql] Erro:", error);
    res.status(500).json({ 
      error: "Erro ao buscar lojas",
      details: error.message
    });
  }
});

export default router;

