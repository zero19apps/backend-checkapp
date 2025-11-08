// src/server.ts
// ✅ Servidor Express para APIs do CheckApp (Standalone)

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3223;

// ✅ Middleware
app.use(cors({
  origin: [
    'http://localhost:3222',
    'http://72.61.218.13:3222',
    'http://127.0.0.1:3222',
    'http://192.168.15.6:3222',
    'http://10.0.2.2:3222', // Android Emulator localhost (frontend)
    'http://10.0.2.2:3223', // ✅ Android Emulator localhost (backend API)
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'http://localhost:8080',
    'http://localhost:3223', // Backend local
    'https://apicheckapp.zero19.top', // ✅ Domínio público da API
    'https://zero19.top', // Frontend
    process.env.FRONTEND_URL || '*'
  ].filter(Boolean), // Em produção, especificar domínios permitidos
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Middleware para extrair schema do JWT (antes das rotas)
import { extractSchema } from './middleware/auth';
app.use('/api', extractSchema); // Aplica em todas as rotas /api

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'backend-checkapp',
    version: '1.0.0'
  });
});

// ✅ Rotas API
import roteiroRoutes from './routes/roteiro';
import lojasRoutes from './routes/lojas';
import mapeamentosRoutes from './routes/mapeamentos';
import funcionariosRoutes from './routes/funcionarios';
import auditoriaRoutes from './routes/auditoria';
import auditoriaDiaRoutes from './routes/auditoriaDia';
import syncRoutes from './routes/sync';
import userRoutes from './routes/user';
import miscRoutes from './routes/misc';

app.use('/api/roteiro', roteiroRoutes);
app.use('/api/lojas', lojasRoutes);
app.use('/api/mapeamentos', mapeamentosRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/auditoriaDia', auditoriaDiaRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/user', userRoutes);
app.use('/api', miscRoutes); // Rotas diversas (image-proxy, upload, etc.)

// ✅ Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ [BACKEND] Erro:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ✅ Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 [BACKEND] Servidor rodando na porta ${PORT}`);
  console.log(`📡 [BACKEND] Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 [BACKEND] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

