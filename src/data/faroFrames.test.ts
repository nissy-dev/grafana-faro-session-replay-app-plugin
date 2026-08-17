import { FieldType, toDataFrame } from '@grafana/data';
import { EventType } from '@grafana/rrweb-types';
import { parseReplayEvents, parseSessionLogs, parseSessionSummaries } from './faroFrames';

const frame = (lines: string[], timestamps: number[] = lines.map((_, index) => index + 1)) =>
  toDataFrame({
    fields: [
      { name: 'Time', type: FieldType.time, values: timestamps },
      { name: 'Line', type: FieldType.string, values: lines },
    ],
  });

describe('Faro Loki frame parsing', () => {
  test('deduplicates sessions and sorts newest first', () => {
    const result = parseSessionSummaries([
      frame([
        JSON.stringify({ session_id: 'older', timestamp: '2026-01-01T00:00:00Z', app_name: 'shop' }),
        JSON.stringify({ session_id: 'newer', timestamp: '2026-01-02T00:00:00Z', browser_name: 'Chrome' }),
        JSON.stringify({ session_id: 'older', timestamp: '2026-01-01T00:00:01Z' }),
      ]),
    ]);

    expect(result.map(({ sessionId }) => sessionId)).toEqual(['newer', 'older']);
    expect(result[0].browser).toBe('Chrome');
  });

  test('parses, deduplicates and orders rrweb events while reporting invalid rows', () => {
    const snapshot = { type: EventType.FullSnapshot, timestamp: 20, data: { node: {}, initialOffset: {} } };
    const meta = { type: EventType.Meta, timestamp: 10, data: { href: 'https://example.com' } };
    const result = parseReplayEvents([
      frame([
        JSON.stringify({ event_data_event: JSON.stringify(snapshot) }),
        JSON.stringify({ event_data_event: JSON.stringify(meta) }),
        JSON.stringify({ event_data_event: JSON.stringify(snapshot) }),
        JSON.stringify({ event_data_event: '{broken' }),
      ]),
    ]);

    expect(result.events).toEqual([meta, snapshot]);
    expect(result.discardedLines).toBe(1);
    expect(result.hasFullSnapshot).toBe(true);
  });

  test('normalizes correlated logs and trace IDs', () => {
    const result = parseSessionLogs([
      frame([
        JSON.stringify({ kind: 'exception', message: 'Failed', traceID: 'abc', timestamp: '2026-01-01T00:00:00Z' }),
      ]),
    ]);

    expect(result[0]).toMatchObject({ kind: 'exception', message: 'Failed', traceId: 'abc' });
  });
});
