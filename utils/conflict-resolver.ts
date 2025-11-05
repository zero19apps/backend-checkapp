// utils/conflict-resolver.ts - Types for Conflict Resolution (Backend only)
// ✅ Apenas tipos/interfaces necessários para o backend

import { Change, ChangeType } from './delta-sync';

// 🔹 Estratégias de resolução de conflito
export enum ConflictResolutionStrategy {
  LAST_WRITE_WINS = 'last-write-wins',
  SERVER_WINS = 'server-wins',
  CLIENT_WINS = 'client-wins',
  MERGE = 'merge',
  USER_CHOICE = 'user-choice'
}

// 🔹 Conflito detectado
export interface Conflict {
  id: string;
  table: string;
  recordId: string;
  localChange: Change;
  remoteChange: Change;
  conflictType: ConflictType;
  resolutionStrategy: ConflictResolutionStrategy;
  resolved: boolean;
  resolution?: ConflictResolution;
  timestamp: string;
}

// 🔹 Tipos de conflito
export enum ConflictType {
  SIMULTANEOUS_UPDATE = 'simultaneous-update',
  DELETE_AFTER_UPDATE = 'delete-after-update',
  UPDATE_AFTER_DELETE = 'update-after-delete',
  FIELD_CONFLICT = 'field-conflict',
  VERSION_MISMATCH = 'version-mismatch'
}

// 🔹 Resolução de conflito
export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  winner: 'local' | 'remote' | 'merged';
  mergedData?: any;
  reason: string;
  timestamp: string;
}

