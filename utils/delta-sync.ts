// utils/delta-sync.ts - Types for Delta Sync (Backend only)
// ✅ Apenas tipos/interfaces necessários para o backend

// 🔹 Tipos de mudança
export enum ChangeType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

// 🔹 Mudança individual
export interface Change {
  id: string;
  type: ChangeType;
  table: string;
  recordId: string;
  data: any;
  timestamp: string;
  version: number;
  checksum: string;
}

// 🔹 Watermark (marcador de sincronização)
export interface Watermark {
  table: string;
  lastSync: string;
  version: number;
  checksum: string;
}

// 🔹 Resultado da sincronização
export interface SyncResult {
  success: boolean;
  changesApplied: number;
  conflictsResolved: number;
  errors: string[];
  newWatermark: Watermark;
}


