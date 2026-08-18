import type { eventWithTime } from '@grafana/rrweb-types';

export interface AppPluginSettings {
  lokiDatasourceUid?: string;
  tempoDatasourceUid?: string;
  defaultTimeRangeHours?: number;
  maxLines?: number;
}

export const DEFAULT_TIME_RANGE_HOURS = 24;
export const DEFAULT_MAX_LINES = 5000;

export interface SessionFilters {
  app?: string;
  environment?: string;
  search?: string;
}

export interface SessionSummary {
  sessionId: string;
  startedAt: number;
  app?: string;
  environment?: string;
  userId?: string;
  userEmail?: string;
  browser?: string;
  pageUrl?: string;
}

/** A single entry of the session activity feed shown next to the replay. */
export interface SessionEvent {
  timestamp: number;
  /** Faro signal kind: `log`, `exception`, `event` or `measurement`. */
  kind: string;
  /** Event or measurement name, when the signal carries one. */
  name?: string;
  message: string;
  level?: string;
  traceId?: string;
  spanId?: string;
  raw: Record<string, unknown>;
}

export interface ReplayParseResult {
  events: eventWithTime[];
  discardedLines: number;
  hasFullSnapshot: boolean;
}
