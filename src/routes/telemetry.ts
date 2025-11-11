import { Router } from 'express';

type TelemetryEvent = {
  event: string;
  schema?: string | null;
  timestamp: string;
  attributes: Record<string, any>;
};

const MAX_EVENTS = 1000;

const telemetryBuffer: TelemetryEvent[] = [];

function recordEvent(event: TelemetryEvent) {
  telemetryBuffer.push(event);
  if (telemetryBuffer.length > MAX_EVENTS) {
    telemetryBuffer.splice(0, telemetryBuffer.length - MAX_EVENTS);
  }
}

function buildSummary() {
  const total = telemetryBuffer.length;
  const byEvent: Record<string, number> = {};
  const bySchema: Record<string, number> = {};

  telemetryBuffer.forEach((evt) => {
    byEvent[evt.event] = (byEvent[evt.event] ?? 0) + 1;
    const schemaKey = evt.schema ?? 'default';
    bySchema[schemaKey] = (bySchema[schemaKey] ?? 0) + 1;
  });

  return {
    total,
    byEvent,
    bySchema,
    lastEventAt: telemetryBuffer.at(-1)?.timestamp ?? null
  };
}

const router = Router();

router.post('/event', (req, res) => {
  const { event, schema, attributes, timestamp } = req.body ?? {};

  if (!event || typeof event !== 'string') {
    return res.status(400).json({ success: false, error: 'Campo "event" é obrigatório.' });
  }

  const normalizedEvent: TelemetryEvent = {
    event,
    schema: typeof schema === 'string' ? schema : null,
    timestamp: typeof timestamp === 'string' ? timestamp : new Date().toISOString(),
    attributes: typeof attributes === 'object' && attributes !== null ? attributes : {}
  };

  recordEvent(normalizedEvent);
  console.log(`📊 [TELEMETRY] ${normalizedEvent.event} @ ${normalizedEvent.timestamp}`, normalizedEvent.attributes);

  return res.status(200).json({ success: true });
});

router.get('/summary', (_req, res) => {
  return res.status(200).json({
    success: true,
    generatedAt: new Date().toISOString(),
    summary: buildSummary()
  });
});

router.get('/events', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, MAX_EVENTS);
  const since = req.query.since ? new Date(String(req.query.since)) : null;
  const filtered = telemetryBuffer
    .filter((evt) => !since || new Date(evt.timestamp) >= since)
    .slice(-limit);

  return res.status(200).json({
    success: true,
    events: filtered
  });
});

export default router;

