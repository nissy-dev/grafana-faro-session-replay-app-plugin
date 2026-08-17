import { FieldType, toDataFrame } from '@grafana/data';
import { createLokiRequest, fetchLokiFramesByTimeWindows, type LokiQueryOptions } from './lokiClient';

const createFrame = (length: number) =>
  toDataFrame({ fields: [{ name: 'Line', type: FieldType.string, values: Array.from({ length }, () => '{}') }] });

describe('Loki client', () => {
  test('creates a forward range query for the configured data source', () => {
    const request = createLokiRequest({
      datasourceUid: 'loki-uid',
      expr: '{kind="event"}',
      from: 1000,
      to: 2000,
      maxLines: 5000,
    });

    expect(request.targets[0]).toMatchObject({
      datasource: { uid: 'loki-uid', type: 'loki' },
      direction: 'forward',
      maxLines: 5000,
      queryType: 'range',
    });
    expect(request.range.from.valueOf()).toBe(1000);
    expect(request.range.to.valueOf()).toBe(2000);
  });

  test('splits a saturated time window and combines child frames', async () => {
    const windows: Array<[number, number]> = [];
    const execute = jest.fn(async ({ from, to, maxLines }: LokiQueryOptions) => {
      windows.push([from, to]);
      return [createFrame(from === 0 && to === 100 ? maxLines : 1)];
    });

    const result = await fetchLokiFramesByTimeWindows(
      {
        datasourceUid: 'loki-uid',
        expr: '{kind="event"}',
        from: 0,
        to: 100,
        maxLines: 2,
        minimumWindowMs: 1,
      },
      execute
    );

    expect(windows).toEqual([
      [0, 100],
      [0, 50],
      [51, 100],
    ]);
    expect(result).toHaveLength(2);
  });
});
