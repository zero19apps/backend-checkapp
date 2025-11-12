"use strict";
// utils/conflict-resolver.ts - Types for Conflict Resolution (Backend only)
// ✅ Apenas tipos/interfaces necessários para o backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictType = exports.ConflictResolutionStrategy = void 0;
// 🔹 Estratégias de resolução de conflito
var ConflictResolutionStrategy;
(function (ConflictResolutionStrategy) {
    ConflictResolutionStrategy["LAST_WRITE_WINS"] = "last-write-wins";
    ConflictResolutionStrategy["SERVER_WINS"] = "server-wins";
    ConflictResolutionStrategy["CLIENT_WINS"] = "client-wins";
    ConflictResolutionStrategy["MERGE"] = "merge";
    ConflictResolutionStrategy["USER_CHOICE"] = "user-choice";
})(ConflictResolutionStrategy || (exports.ConflictResolutionStrategy = ConflictResolutionStrategy = {}));
// 🔹 Tipos de conflito
var ConflictType;
(function (ConflictType) {
    ConflictType["SIMULTANEOUS_UPDATE"] = "simultaneous-update";
    ConflictType["DELETE_AFTER_UPDATE"] = "delete-after-update";
    ConflictType["UPDATE_AFTER_DELETE"] = "update-after-delete";
    ConflictType["FIELD_CONFLICT"] = "field-conflict";
    ConflictType["VERSION_MISMATCH"] = "version-mismatch";
})(ConflictType || (exports.ConflictType = ConflictType = {}));
