import { buildReplayQuery, buildSessionEventsQuery, buildSessionsQuery, escapeLogqlString } from './lokiQueries';

describe('Loki query builders', () => {
  test('escapes untrusted LogQL string values', () => {
    expect(escapeLogqlString('a"b\\c\n')).toBe('a\\"b\\\\c\\n');
  });

  test('builds a filtered session-list query', () => {
    expect(buildSessionsQuery({ app: 'shop', environment: 'prod', search: 'user"42' })).toBe(
      '{kind="event"} | json | event_name="faro.session_recording.started" | app_name="shop" | app_environment="prod" |= "user\\"42"'
    );
  });

  test('builds replay and correlated event queries without using session ID as a stream label', () => {
    expect(buildReplayQuery('session-1')).toBe(
      '{kind="event"} | json | event_name="faro.session_recording.event" | session_id="session-1"'
    );
  });

  test('excludes the replay payload from the session event query', () => {
    expect(buildSessionEventsQuery('session-1')).toBe(
      '{kind=~"log|exception|event|measurement"} | json | session_id="session-1" | event_name!="faro.session_recording.event"'
    );
  });
});
