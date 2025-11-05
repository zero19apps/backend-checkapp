// backend/src/routes/user.ts
import { Router } from 'express';

const router = Router();

// GET /api/user/get-user-name
router.get('/get-user-name', async (req, res) => {
  try {
    // Implementar conforme necessário
    res.status(200).json({ message: 'Not implemented yet' });
  } catch (error: any) {
    console.error('❌ [BACKEND-user-get-user-name] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

