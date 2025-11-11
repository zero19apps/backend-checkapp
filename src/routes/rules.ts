import { Router } from 'express';
import { getPool, getTableName } from '../utils/db-helper';

type RuleRecord = {
  id: string;
  table: string;
  field: string;
  type: string;
  severity: string;
  message: string;
  metadata?: Record<string, any> | null;
  version?: number;
  updated_at: string;
  enabled?: boolean | null;
};

type RulesResponse = {
  success: boolean;
  schema?: string;
  count: number;
  rules: RuleRecord[];
  fetchedAt: string;
  hasMore: boolean;
  nextCursor?: string;
  nextSince?: string;
  checksum?: string;
  fetched: number;
  full: boolean;
  errors?: string[];
};

const DEFAULT_UPDATED_AT = '2024-01-01T00:00:00.000Z';

const DEFAULT_RULES: RuleRecord[] = [
  {
    id: 'total_valor_min_0',
    table: 'total',
    field: 'valor',
    type: 'MIN',
    severity: 'HIGH',
    message: 'O campo Valor não pode ser negativo.',
    metadata: {
      min: 0.0,
      inclusive: true
    },
    version: 1,
    updated_at: DEFAULT_UPDATED_AT,
    enabled: true
  },
  {
    id: 'total_qtd_vendas_min_0',
    table: 'total',
    field: 'qtd_vendas',
    type: 'MIN',
    severity: 'MEDIUM',
    message: 'Quantidade de vendas não pode ser negativa.',
    metadata: {
      min: 0,
      inclusive: true
    },
    version: 1,
    updated_at: DEFAULT_UPDATED_AT,
    enabled: true
  },
  {
    id: 'total_foto_maquininha_required',
    table: 'total',
    field: 'foto',
    type: 'REQUIRED',
    severity: 'MEDIUM',
    message: 'Foto principal é obrigatória para auditorias de Maquininha.',
    metadata: {
      requires_tipo: ['MAQUININHA'],
      allow_when_offline: false
    },
    version: 1,
    updated_at: DEFAULT_UPDATED_AT,
    enabled: true
  },
  {
    id: 'total_valor_maquininha_min_100',
    table: 'total',
    field: 'valor',
    type: 'MIN',
    severity: 'LOW',
    message: 'Valores inferiores a R$100 em Maquininha exigem revisão.',
    metadata: {
      min: 100.0,
      inclusive: false,
      requires_tipo: ['MAQUININHA']
    },
    version: 1,
    updated_at: DEFAULT_UPDATED_AT,
    enabled: true
  }
];

const router = Router();

const ISO_FALLBACK = '1970-01-01T00:00:00.000Z';
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

router.get('/list', async (req, res) => {
  const schema = req.schema;
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];
  const sinceParam = parseSince(req.query.since);
  const cursorInfo = parseCursor(req.query.cursor);
  const limit = normalizeLimit(req.query.limit);
  const isFullRequested = toBoolean(req.query.full) || (!sinceParam && !cursorInfo);

  const effectiveBaseline = cursorInfo?.timestamp ?? sinceParam ?? ISO_FALLBACK;
  const rules: RuleRecord[] = [];
  let hasMore = false;
  let nextCursor: string | undefined;
  let nextSince: string | undefined;

  try {
    const filteredDefaults = DEFAULT_RULES.filter((rule) => {
      const updatedAt = new Date(rule.updated_at).toISOString();
      return updatedAt > effectiveBaseline;
    });
    rules.push(...filteredDefaults);

    const pool = getPool();
    const tableName = getTableName('audit_rules', schema);

    try {
      const baseline = effectiveBaseline;
      const queryParams: any[] = [baseline];

      let whereClause = '(updated_at IS NULL OR updated_at > $1)';
      let cursorClause = '';

      if (cursorInfo) {
        queryParams.push(cursorInfo.id);
        whereClause = '(updated_at > $1 OR (updated_at = $1 AND id > $2))';
      }

      queryParams.push(limit);

      const result = await pool.query(
        `
          SELECT 
            id,
            table_name,
            field,
            type,
            severity,
            message,
            metadata,
            version,
            enabled,
            COALESCE(updated_at, NOW()) AS updated_at
          FROM ${tableName}
          WHERE ${whereClause} AND (enabled IS NULL OR enabled = TRUE)
          ORDER BY COALESCE(updated_at, NOW()), id
          LIMIT $${queryParams.length}
        `,
        queryParams
      );

      result.rows.forEach((row: any) => {
        rules.push({
          id: row.id,
          table: row.table_name || row.table || row.scope || 'total',
          field: row.field,
          type: row.type,
          severity: row.severity || 'MEDIUM',
          message: row.message,
          metadata: typeof row.metadata === 'object'
            ? row.metadata
            : parseJsonSafe(row.metadata),
          version: row.version ?? 1,
          updated_at: new Date(row.updated_at).toISOString(),
          enabled: row.enabled ?? true
        });
      });

      hasMore = result.rows.length === limit;
      if (result.rows.length > 0) {
        const lastRow = result.rows[result.rows.length - 1];
        const lastTimestamp = new Date(lastRow.updated_at).toISOString();
        nextSince = lastTimestamp;
        nextCursor = encodeCursor(lastTimestamp, String(lastRow.id));
      } else {
        nextSince = cursorInfo?.timestamp ?? sinceParam ?? ISO_FALLBACK;
      }
    } catch (error: any) {
      const code = error?.code;
      if (code === '42P01') {
        console.warn(`⚠️ [RULES] Tabela audit_rules não encontrada para schema ${schema}. Utilizando regras padrão.`);
      } else {
        console.error('❌ [RULES] Erro ao consultar regras personalizadas:', error);
        errors.push(error instanceof Error ? error.message : 'Erro desconhecido ao consultar regras personalizadas');
      }
      nextSince = sinceParam ?? ISO_FALLBACK;
      nextCursor = cursorInfo?.raw;
    }
  } catch (error: any) {
    console.error('❌ [RULES] Erro geral ao montar lista de regras:', error);
    errors.push(error instanceof Error ? error.message : 'Erro interno');
    nextSince = sinceParam ?? ISO_FALLBACK;
    nextCursor = cursorInfo?.raw;
  }

  const checksum = computeChecksum(rules);

  const response: RulesResponse = {
    success: errors.length === 0,
    schema,
    count: rules.length,
    rules,
    fetchedAt,
    hasMore,
    nextCursor,
    nextSince,
    checksum,
    fetched: rules.length,
    full: isFullRequested && !cursorInfo,
    errors: errors.length > 0 ? errors : undefined
  };

  return res.status(errors.length === 0 ? 200 : 207).json(response);
});

function parseJsonSafe(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === 'object') {
    return value as Record<string, any>;
  }
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function parseSince(value: unknown): string | undefined {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return undefined;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
}

function parseCursor(cursor: unknown): { timestamp: string; id: string; raw: string } | null {
  if (!cursor || typeof cursor !== 'string') {
    return null;
  }
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [timestamp, id] = decoded.split('|');
    if (!timestamp || !id) {
      return null;
    }
    return { timestamp: new Date(timestamp).toISOString(), id, raw: cursor };
  } catch {
    return null;
  }
}

function encodeCursor(timestamp: string, id: string): string {
  return Buffer.from(`${timestamp}|${id}`).toString('base64');
}

function normalizeLimit(rawLimit: unknown): number {
  const parsed = Number(Array.isArray(rawLimit) ? rawLimit[0] : rawLimit);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.some((v) => toBoolean(v));
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  return false;
}

function computeChecksum(rules: RuleRecord[]): string {
  const payload = rules
    .map((rule) => `${rule.id}-${rule.updated_at}`)
    .join('|');
  return payload.length === 0 ? '' : require('crypto').createHash('md5').update(payload).digest('hex');
}

export default router;

