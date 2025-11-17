// backend/src/routes/mapeamentos.ts
import { Router } from 'express';
import { getPool, getTableName } from '../utils/db-helper';
import { MapeamentoService } from '../../lib/mapeamentoPostgres';

const router = Router();

// ✅ IMPORTANTE: Rotas específicas DEVEM vir ANTES de rotas com parâmetros dinâmicos
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

// ✅ ROTA ESPECÍFICA: Deve vir ANTES de /:idLoja
// GET /api/mapeamentos/dispositivo/:id
router.get('/dispositivo/:id', async (req, res) => {
  try {
    const schema = req.schema;
    const { id } = req.params;

    console.log(`🔍 [BACKEND-mapeamentos-get-by-id] Buscando mapeamento ID: ${id} | Schema: ${schema}`);

    // ✅ Usar MapeamentoService mas precisamos passar o schema
    // Por enquanto, vamos fazer direto com getPool
    const pool = getPool();
    const tableName = getTableName('mapeamentos', schema);
    const client = await pool.connect();

    try {
      const result = await client.query(
        `
        SELECT 
          id,
          id_loja,
          sistema,
          tipo,
          status,
          nserie,
          relatorio,
          possui_tef,
          foto,
          observacao,
          dcriacao,
          prioridade,
          criado_em,
          atualizado_em
        FROM ${tableName}
        WHERE id = $1
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Mapeamento não encontrado',
        });
      }

      // ✅ Converter para formato esperado pelo frontend (maiúsculas)
      const mapeamento = result.rows[0];
      const mapeamentoFormatted = {
        ID: mapeamento.id,
        'ID LOJA': mapeamento.id_loja,
        SISTEMA: mapeamento.sistema,
        TIPO: mapeamento.tipo,
        STATUS: mapeamento.status,
        nSerie: mapeamento.nserie,
        RELATORIO: mapeamento.relatorio,
        'POSSUI TEF': mapeamento.possui_tef,
        FOTO: mapeamento.foto,
        Observacao: mapeamento.observacao,
        dCriacao: mapeamento.dcriacao,
        Prioridade: mapeamento.prioridade,
        ID_Shopping: '', // Campo legado
      };

      res.status(200).json({
        success: true,
        mapeamento: mapeamentoFormatted,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [BACKEND-mapeamentos-get-by-id] Erro:', error);
    res.status(500).json({
      error: 'Erro ao buscar mapeamento',
      details: error.message,
    });
  }
});

// GET /api/mapeamentos/:idLoja
router.get('/:idLoja', async (req, res) => {
  try {
    const schema = req.schema;
    const { idLoja } = req.params;
    const pool = getPool();
    const tableName = getTableName('mapeamentos', schema);
    const client = await pool.connect();

    try {
      const result = await client.query(
        `
        SELECT 
          id,
          id_loja,
          sistema,
          tipo,
          status,
          nserie,
          relatorio,
          possui_tef,
          foto,
          observacao,
          dcriacao,
          prioridade,
          criado_em,
          atualizado_em
        FROM ${tableName}
        WHERE id_loja = $1
        ORDER BY tipo, sistema
        `,
        [idLoja]
      );

      res.status(200).json({
        success: true,
        mapeamentos: result.rows,
        count: result.rows.length,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [BACKEND-mapeamentos-idLoja] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/mapeamentos/:id
router.put('/:id', async (req, res) => {
  try {
    const schema = req.schema;
    const { id } = req.params;
    const payload = req.body;

    console.log(`🔄 [BACKEND-mapeamentos-update] Atualizando mapeamento ID: ${id} | Schema: ${schema}`);

    // ✅ Converter formato do frontend (maiúsculas) para formato do banco (minúsculas)
    const updates: any = {};
    
    if (payload.SISTEMA !== undefined) updates.sistema = payload.SISTEMA;
    if (payload.STATUS !== undefined) updates.status = payload.STATUS;
    if (payload.nSerie !== undefined) updates.nserie = payload.nSerie;
    if (payload.RELATORIO !== undefined) updates.relatorio = payload.RELATORIO;
    if (payload['POSSUI TEF'] !== undefined) updates.possui_tef = payload['POSSUI TEF'];
    if (payload.FOTO !== undefined) updates.foto = payload.FOTO;
    if (payload.Observacao !== undefined) updates.observacao = payload.Observacao;
    if (payload.dCriacao !== undefined) {
      // Converter string para Date se necessário
      updates.dcriacao = payload.dCriacao instanceof Date 
        ? payload.dCriacao 
        : payload.dCriacao ? new Date(payload.dCriacao) : null;
    }
    if (payload.Prioridade !== undefined) {
      // Converter para boolean
      updates.prioridade = typeof payload.Prioridade === 'boolean' 
        ? payload.Prioridade 
        : payload.Prioridade === 'true' || payload.Prioridade === true || payload.Prioridade === 1;
    }

    const pool = getPool();
    const tableName = getTableName('mapeamentos', schema);
    const client = await pool.connect();

    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'criado_em')
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      const values = [id, ...Object.values(updates).filter((_, index) => 
        Object.keys(updates)[index] !== 'id' && Object.keys(updates)[index] !== 'criado_em'
      )];

      if (setClause.length === 0) {
        return res.status(400).json({
          error: 'Nenhum campo para atualizar',
        });
      }

      const result = await client.query(
        `
        UPDATE ${tableName}
        SET ${setClause}, atualizado_em = NOW()
        WHERE id = $1
        RETURNING *
        `,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Mapeamento não encontrado',
        });
      }

      // ✅ Converter de volta para formato do frontend
      const mapeamento = result.rows[0];
      const mapeamentoFormatted = {
        ID: mapeamento.id,
        'ID LOJA': mapeamento.id_loja,
        SISTEMA: mapeamento.sistema,
        TIPO: mapeamento.tipo,
        STATUS: mapeamento.status,
        nSerie: mapeamento.nserie,
        RELATORIO: mapeamento.relatorio,
        'POSSUI TEF': mapeamento.possui_tef,
        FOTO: mapeamento.foto,
        Observacao: mapeamento.observacao,
        dCriacao: mapeamento.dcriacao,
        Prioridade: mapeamento.prioridade,
      };

      res.status(200).json({
        success: true,
        mapeamento: mapeamentoFormatted,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [BACKEND-mapeamentos-update] Erro:', error);
    res.status(500).json({
      error: 'Erro ao atualizar mapeamento',
      details: error.message,
    });
  }
});

// POST /api/mapeamentos/update-dispositivo (compatibilidade com frontend)
router.post('/update-dispositivo', async (req, res) => {
  try {
    const schema = req.schema;
    const payload = req.body;

    if (!payload.ID) {
      return res.status(400).json({
        error: 'ID do mapeamento é obrigatório',
      });
    }

    // ✅ Reutilizar a lógica do PUT
    const { id } = { id: payload.ID };
    const updates: any = {};
    
    if (payload.SISTEMA !== undefined) updates.sistema = payload.SISTEMA;
    if (payload.STATUS !== undefined) updates.status = payload.STATUS;
    if (payload.nSerie !== undefined) updates.nserie = payload.nSerie;
    if (payload.RELATORIO !== undefined) updates.relatorio = payload.RELATORIO;
    if (payload['POSSUI TEF'] !== undefined) updates.possui_tef = payload['POSSUI TEF'];
    if (payload.FOTO !== undefined) updates.foto = payload.FOTO;
    if (payload.Observacao !== undefined) updates.observacao = payload.Observacao;
    if (payload.dCriacao !== undefined) {
      // Converter string para Date se necessário
      updates.dcriacao = payload.dCriacao instanceof Date 
        ? payload.dCriacao 
        : payload.dCriacao ? new Date(payload.dCriacao) : null;
    }
    if (payload.Prioridade !== undefined) {
      // Converter para boolean
      updates.prioridade = typeof payload.Prioridade === 'boolean' 
        ? payload.Prioridade 
        : payload.Prioridade === 'true' || payload.Prioridade === true || payload.Prioridade === 1;
    }

    const pool = getPool();
    const tableName = getTableName('mapeamentos', schema);
    const client = await pool.connect();

    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'criado_em')
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      const values = [id, ...Object.values(updates).filter((_, index) => 
        Object.keys(updates)[index] !== 'id' && Object.keys(updates)[index] !== 'criado_em'
      )];

      if (setClause.length === 0) {
        return res.status(400).json({
          error: 'Nenhum campo para atualizar',
        });
      }

      const result = await client.query(
        `
        UPDATE ${tableName}
        SET ${setClause}, atualizado_em = NOW()
        WHERE id = $1
        RETURNING *
        `,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Mapeamento não encontrado',
        });
      }

      // ✅ Converter de volta para formato do frontend
      const mapeamento = result.rows[0];
      const mapeamentoFormatted = {
        ID: mapeamento.id,
        'ID LOJA': mapeamento.id_loja,
        SISTEMA: mapeamento.sistema,
        TIPO: mapeamento.tipo,
        STATUS: mapeamento.status,
        nSerie: mapeamento.nserie,
        RELATORIO: mapeamento.relatorio,
        'POSSUI TEF': mapeamento.possui_tef,
        FOTO: mapeamento.foto,
        Observacao: mapeamento.observacao,
        dCriacao: mapeamento.dcriacao,
        Prioridade: mapeamento.prioridade,
      };

      res.status(200).json({
        success: true,
        mapeamento: mapeamentoFormatted,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [BACKEND-mapeamentos-update-dispositivo] Erro:', error);
    res.status(500).json({
      error: 'Erro ao atualizar mapeamento',
      details: error.message,
    });
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

