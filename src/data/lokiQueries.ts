import type { SessionFilters } from '../types';

const RECORDING_EVENT = 'faro.session_recording.event';
const RECORDING_STARTED = 'faro.session_recording.started';

export const escapeLogqlString = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n').replaceAll('\r', '\\r');

const fieldEquals = (field: string, value: string): string => `${field}="${escapeLogqlString(value)}"`;

const fieldNotEquals = (field: string, value: string): string => `${field}!="${escapeLogqlString(value)}"`;

export const buildSessionsQuery = (filters: SessionFilters = {}): string => {
  const pipeline = ['{kind="event"}', '| json', `| ${fieldEquals('event_name', RECORDING_STARTED)}`];

  if (filters.app) {
    pipeline.push(`| ${fieldEquals('app_name', filters.app)}`);
  }
  if (filters.environment) {
    pipeline.push(`| ${fieldEquals('app_environment', filters.environment)}`);
  }
  if (filters.search) {
    pipeline.push(`|= "${escapeLogqlString(filters.search)}"`);
  }

  return pipeline.join(' ');
};

export const buildReplayQuery = (sessionId: string): string =>
  [
    '{kind="event"}',
    '| json',
    `| ${fieldEquals('event_name', RECORDING_EVENT)}`,
    `| ${fieldEquals('session_id', sessionId)}`,
  ].join(' ');

/**
 * Every user facing signal of a session: logs, exceptions, custom events and measurements.
 * Replay events share `kind="event"` but carry the whole rrweb payload, so they are excluded.
 */
export const buildSessionEventsQuery = (sessionId: string): string =>
  [
    '{kind=~"log|exception|event|measurement"}',
    '| json',
    `| ${fieldEquals('session_id', sessionId)}`,
    `| ${fieldNotEquals('event_name', RECORDING_EVENT)}`,
  ].join(' ');
