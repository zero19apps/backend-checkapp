// backend/src/routes/funcionarios.ts
import { Router } from 'express';
import {
  CreateFuncionarioInput,
  UpdateFuncionarioStatusInput,
  createFuncionario,
  getFuncionarios,
  updateFuncionarioStatus,
} from '../../lib/funcionarioPostgres';

const router = Router();

// GET /api/funcionarios/get-all-psql
router.get('/get-all-psql', async (req, res) => {
  try {
    const schema = req.schema;
    const funcionariosData = await getFuncionarios(schema);

    res.status(200).json({
      success: true,
      funcionariosData,
      count: funcionariosData.length,
    });
  } catch (error: any) {
    console.error('❌ [FUNCIONARIOS-get-all-psql] Erro:', error);
    res.status(500).json({
      error: 'Erro ao buscar funcionários',
      details: error.message,
    });
  }
});

// POST /api/funcionarios
router.post('/', async (req, res) => {
  try {
    const schema = req.schema;
    const payload = req.body as CreateFuncionarioInput;

    if (!payload?.id_loja || !payload?.nome_funcionario) {
      return res.status(400).json({
        error: 'Campos obrigatórios: id_loja, nome_funcionario',
      });
    }

    const funcionario = await createFuncionario(payload, schema);
    res.status(201).json({
      success: true,
      funcionario,
    });
  } catch (error: any) {
    console.error('❌ [FUNCIONARIOS-create] Erro:', error);
    res.status(500).json({
      error: 'Erro ao criar funcionário',
      details: error.message,
    });
  }
});

// PATCH /api/funcionarios/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const schema = req.schema;
    const { id } = req.params;
    const { status } = req.body as UpdateFuncionarioStatusInput;

    if (typeof status === 'undefined') {
      return res.status(400).json({
        error: 'Campo obrigatório: status',
      });
    }

    const funcionario = await updateFuncionarioStatus(id, status, schema);
    res.status(200).json({
      success: true,
      funcionario,
    });
  } catch (error: any) {
    console.error('❌ [FUNCIONARIOS-update-status] Erro:', error);
    if (error.message === 'Funcionário não encontrado') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Erro ao atualizar status do funcionário',
      details: error.message,
    });
  }
});

export default router;


