"use strict";
// utils/delta-sync.ts - Types for Delta Sync (Backend only)
// ✅ Apenas tipos/interfaces necessários para o backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeType = void 0;
// 🔹 Tipos de mudança
var ChangeType;
(function (ChangeType) {
    ChangeType["CREATE"] = "CREATE";
    ChangeType["UPDATE"] = "UPDATE";
    ChangeType["DELETE"] = "DELETE";
})(ChangeType || (exports.ChangeType = ChangeType = {}));
