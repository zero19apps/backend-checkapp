// backend/src/routes/misc.ts
// Rotas diversas: image-proxy, upload, etc.

import { Router } from 'express';
import { handleImageProxy } from '../services/image-proxy';
import { handleUploadFoto } from '../services/upload';

const router = Router();

// GET /api/image-proxy
router.get('/image-proxy', handleImageProxy);

// POST /api/upload-foto
router.post('/upload-foto', handleUploadFoto);

// POST /api/upload-foto-auditoria
router.post('/upload-foto-auditoria', handleUploadFoto); // Por enquanto usa o mesmo handler

export default router;

