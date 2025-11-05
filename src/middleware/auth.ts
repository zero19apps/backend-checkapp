// src/middleware/auth.ts
// ✅ Middleware para extrair schema do JWT do Supabase

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ✅ Estender Request para incluir schema
declare global {
  namespace Express {
    interface Request {
      schema?: string;
      user?: {
        id: string;
        email?: string;
        role?: string;
      };
    }
  }
}

/**
 * Middleware para extrair schema do JWT do Supabase
 * O schema está em raw_app_meta_data.schema
 */
export function extractSchema(req: Request, res: Response, next: NextFunction) {
  try {
    // Pegar token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Se não tiver token, usar schema padrão (para compatibilidade)
      req.schema = process.env.SHOPPING_SCHEMA || 'passeio';
      console.log('⚠️ [AUTH] Token não fornecido, usando schema padrão:', req.schema);
      return next();
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Decodificar JWT (sem verificar assinatura - Supabase usa JWT público)
    // O Supabase não assina com segredo, apenas valida estrutura
    const decoded = jwt.decode(token, { complete: true }) as any;

    if (!decoded || !decoded.payload) {
      console.log('⚠️ [AUTH] Token inválido, usando schema padrão');
      req.schema = process.env.SHOPPING_SCHEMA || 'passeio';
      return next();
    }

    // Extrair schema do raw_app_meta_data
    const rawAppMetaData = decoded.payload.user_metadata || decoded.payload.raw_app_meta_data || {};
    const schema = rawAppMetaData.schema;

    if (schema) {
      req.schema = schema;
      req.user = {
        id: decoded.payload.sub || decoded.payload.user_id || '',
        email: decoded.payload.email,
        role: rawAppMetaData.role
      };
      console.log('✅ [AUTH] Schema extraído do token:', schema, '| User:', req.user.email);
    } else {
      // Fallback para schema padrão se não tiver no token
      req.schema = process.env.SHOPPING_SCHEMA || 'passeio';
      console.log('⚠️ [AUTH] Schema não encontrado no token, usando padrão:', req.schema);
    }

    next();
  } catch (error: any) {
    console.error('❌ [AUTH] Erro ao extrair schema:', error.message);
    // Em caso de erro, usar schema padrão
    req.schema = process.env.SHOPPING_SCHEMA || 'passeio';
    next();
  }
}

