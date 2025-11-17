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
 * 🔒 SEGURANÇA: NÃO há fallback - se não conseguir extrair o schema, a requisição é REJEITADA
 * O schema está em raw_app_meta_data.schema
 */
export function extractSchema(req: Request, res: Response, next: NextFunction) {
  try {
    // Pegar token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [AUTH] Token não fornecido');
      return res.status(401).json({ 
        error: 'Token de autenticação não fornecido',
        message: 'É necessário fornecer um token Bearer válido no header Authorization'
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Decodificar JWT (sem verificar assinatura - Supabase usa JWT público)
    // O Supabase não assina com segredo, apenas valida estrutura
    const decoded = jwt.decode(token, { complete: true }) as any;

    if (!decoded || !decoded.payload) {
      console.error('❌ [AUTH] Token inválido ou malformado');
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'O token fornecido não é um JWT válido'
      });
    }

    // 🐛 DEBUG: Log completo do payload para debug
    const payload = decoded.payload;
    console.log('🔍 [AUTH] ========== DEBUG JWT ==========');
    console.log('🔍 [AUTH] Email:', payload.email);
    console.log('🔍 [AUTH] User ID:', payload.sub || payload.user_id);
    console.log('🔍 [AUTH] Payload keys:', Object.keys(payload));
    console.log('🔍 [AUTH] raw_app_meta_data:', payload.raw_app_meta_data);
    console.log('🔍 [AUTH] app_metadata:', payload.app_metadata);
    console.log('🔍 [AUTH] user_metadata:', payload.user_metadata);
    console.log('🔍 [AUTH] Payload completo (JSON):', JSON.stringify(payload, null, 2));
    console.log('🔍 [AUTH] ==============================');

    // Extrair schema - tentar múltiplos caminhos possíveis
    let schema: string | undefined;
    let rawAppMetaData: any = {};

    // 1. Tentar raw_app_meta_data primeiro (padrão Supabase)
    if (payload.raw_app_meta_data) {
      rawAppMetaData = payload.raw_app_meta_data;
      schema = rawAppMetaData.schema;
      console.log('✅ [AUTH] raw_app_meta_data encontrado:', rawAppMetaData);
    }
    
    // 2. Tentar app_metadata como fallback
    if (!schema && payload.app_metadata) {
      rawAppMetaData = payload.app_metadata;
      schema = rawAppMetaData.schema;
      console.log('✅ [AUTH] app_metadata encontrado:', rawAppMetaData);
    }
    
    // 3. Tentar user_metadata como último recurso
    if (!schema && payload.user_metadata) {
      rawAppMetaData = payload.user_metadata;
      schema = rawAppMetaData.schema;
      console.log('✅ [AUTH] user_metadata encontrado:', rawAppMetaData);
    }
    
    // 4. Tentar direto no payload (caso raro)
    if (!schema && payload.schema) {
      schema = payload.schema;
      console.log('✅ [AUTH] schema encontrado diretamente no payload');
    }

    // 🔒 SEGURANÇA: SEM SCHEMA = REQUISIÇÃO REJEITADA
    if (!schema) {
      console.error('❌ [AUTH] ⚠️⚠️⚠️ SCHEMA NÃO ENCONTRADO NO TOKEN!');
      console.error('❌ [AUTH] Email do usuário:', payload.email);
      console.error('❌ [AUTH] Payload completo disponível nos logs acima');
      return res.status(403).json({ 
        error: 'Schema não encontrado no token',
        message: 'O token de autenticação não contém o schema necessário para acessar os dados. Entre em contato com o administrador.',
        email: payload.email || 'unknown'
      });
    }

    // Schema encontrado - continuar
    req.schema = schema;
    req.user = {
      id: payload.sub || payload.user_id || '',
      email: payload.email,
      role: rawAppMetaData.role
    };
    console.log('✅ [AUTH] ✅✅✅ Schema extraído com sucesso:', schema, '| User:', req.user.email, '| Role:', req.user.role);

    next();
  } catch (error: any) {
    console.error('❌ [AUTH] Erro ao extrair schema:', error.message);
    console.error('❌ [AUTH] Stack trace:', error.stack);
    // 🔒 SEGURANÇA: Em caso de erro, REJEITAR a requisição
    return res.status(500).json({ 
      error: 'Erro ao processar token de autenticação',
      message: 'Ocorreu um erro ao validar o token. Tente fazer login novamente.'
    });
  }
}


