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

export interface SessionLog {
  timestamp: number;
  kind: string;
  message: string;
  level?: string;
  traceId?: string;
  raw: Record<string, unknown>;
}

export interface ReplayParseResult {
  events: eventWithTime[];
  discardedLines: number;
  hasFullSnapshot: boolean;
}
