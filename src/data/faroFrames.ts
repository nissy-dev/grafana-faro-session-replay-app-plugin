import { EventType, type eventWithTime } from '@grafana/rrweb-types';
import type { DataFrame, Field } from '@grafana/data';
import type { ReplayParseResult, SessionEvent, SessionSummary } from '../types';

type FaroLine = Record<string, unknown>;

export const parseSessionSummaries = (frames: DataFrame[]): SessionSummary[] => {
  const sessions = new Map<string, SessionSummary>();

  for (const row of readRows(frames)) {
    const sessionId = asString(row.line.session_id);
    if (!sessionId) {
      continue;
    }

    const summary: SessionSummary = {
      sessionId,
      startedAt: parseTimestamp(row.line.timestamp) ?? row.timestamp,
      app: asString(row.line.app_name),
      environment: asString(row.line.app_environment),
      userId: asString(row.line.user_id),
      userEmail: asString(row.line.user_email),
      browser: joinBrowser(row.line),
      pageUrl: asString(row.line.page_url),
    };
    const existing = sessions.get(sessionId);
    if (!existing || summary.startedAt < existing.startedAt) {
      sessions.set(sessionId, summary);
    }
  }

  return [...sessions.values()].sort((left, right) => right.startedAt - left.startedAt);
};

export const parseReplayEvents = (frames: DataFrame[]): ReplayParseResult => {
  const events = new Map<string, eventWithTime>();
  let discardedLines = 0;

  for (const { line } of readRows(frames)) {
    const payload = line.event_data_event ?? line.event;
    try {
      const event = JSON.parse(asString(payload) ?? '') as eventWithTime;
      if (!Number.isFinite(event.timestamp) || !Number.isInteger(event.type) || typeof event.data !== 'object') {
        throw new Error('Invalid rrweb event');
      }
      events.set(`${event.timestamp}:${event.type}:${JSON.stringify(event.data)}`, event);
    } catch {
      discardedLines += 1;
    }
  }

  const sortedEvents = [...events.values()].sort((left, right) => left.timestamp - right.timestamp);
  return {
    events: sortedEvents,
    discardedLines,
    hasFullSnapshot: sortedEvents.some(({ type }) => type === EventType.FullSnapshot),
  };
};

export const parseSessionEvents = (frames: DataFrame[]): SessionEvent[] =>
  readRows(frames)
    .map(({ line, timestamp }) => ({
      timestamp: parseTimestamp(line.timestamp) ?? timestamp,
      kind: asString(line.kind) ?? 'log',
      name: asString(line.event_name) ?? (asString(line.kind) === 'measurement' ? asString(line.type) : undefined),
      message: describeSignal(line),
      level: asString(line.level),
      traceId: asString(line.traceID) ?? asString(line.trace_id),
      spanId: asString(line.spanID) ?? asString(line.span_id),
      raw: line,
    }))
    .sort((left, right) => left.timestamp - right.timestamp);

const readRows = (frames: DataFrame[]): Array<{ line: FaroLine; timestamp: number }> => {
  const rows: Array<{ line: FaroLine; timestamp: number }> = [];

  for (const frame of frames) {
    const lineField = findField(frame.fields, ['Line', 'line']);
    const timeField = findField(frame.fields, ['Time', 'ts', 'timestamp']);
    if (!lineField) {
      continue;
    }

    for (let index = 0; index < frame.length; index += 1) {
      const rawLine = lineField.values[index];
      const line = typeof rawLine === 'string' ? safeParseLine(rawLine) : asRecord(rawLine);
      if (!line) {
        continue;
      }
      rows.push({ line, timestamp: parseTimestamp(timeField?.values[index]) ?? 0 });
    }
  }

  return rows;
};

const findField = (fields: Field[], names: string[]): Field | undefined =>
  fields.find(({ name }) => names.some((candidate) => candidate.toLowerCase() === name.toLowerCase()));

const safeParseLine = (value: string): FaroLine | undefined => {
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return undefined;
  }
};

const asRecord = (value: unknown): FaroLine | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as FaroLine) : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const parseTimestamp = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

/** Faro flattens each signal differently, so the human readable part lives under a different key per kind. */
const describeSignal = (line: FaroLine): string => {
  switch (asString(line.kind)) {
    case 'exception':
      return [asString(line.type), asString(line.value)].filter(Boolean).join(': ');
    case 'event':
      return joinPrefixedValues(line, 'event_data_');
    case 'measurement':
      return joinPrefixedValues(line, 'value_');
    default:
      return asString(line.message) ?? asString(line.body) ?? '';
  }
};

const joinPrefixedValues = (line: FaroLine, prefix: string): string =>
  Object.entries(line)
    .filter(([key, value]) => key.startsWith(prefix) && (typeof value === 'string' || typeof value === 'number'))
    .map(([key, value]) => `${key.slice(prefix.length)}=${value}`)
    .join(' ');

const joinBrowser = (line: FaroLine): string | undefined => {
  const name = asString(line.browser_name);
  const version = asString(line.browser_version);
  return [name, version].filter(Boolean).join(' ') || undefined;
};
