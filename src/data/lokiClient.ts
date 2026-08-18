import { from, fromEvent, lastValueFrom, takeUntil } from 'rxjs';
import { CoreApp, dateTime, type DataFrame, type DataQueryRequest } from '@grafana/data';
// Its replacement, `getDataSourceInstance` from `@grafana/runtime/unstable`, only exists in
// Grafana 13.1+, while this plugin supports `>=13.0.0`.
import { getDataSourceSrv } from '@grafana/runtime';

interface LokiQuery {
  refId: string;
  datasource?: { uid: string; type: string };
  expr: string;
  queryType: 'range';
  maxLines: number;
  direction: 'forward';
}

export interface LokiQueryOptions {
  datasourceUid: string;
  expr: string;
  from: number;
  to: number;
  maxLines: number;
  signal?: AbortSignal;
}

export interface SplitQueryOptions extends LokiQueryOptions {
  maxDepth?: number;
  minimumWindowMs?: number;
}

type QueryExecutor = (options: LokiQueryOptions) => Promise<DataFrame[]>;

export const executeLokiQuery: QueryExecutor = async (options) => {
  if (options.signal?.aborted) {
    throw new DOMException('The Loki query was aborted', 'AbortError');
  }

  // eslint-disable-next-line @typescript-eslint/no-deprecated -- see the import comment
  const datasource = await getDataSourceSrv().get(options.datasourceUid);
  const request = createLokiRequest(options);
  const abort$ = options.signal ? fromEvent(options.signal, 'abort') : undefined;
  const response$ = from(datasource.query(request));
  const response = await lastValueFrom(abort$ ? response$.pipe(takeUntil(abort$)) : response$, {
    defaultValue: undefined,
  });

  if (!response) {
    throw new DOMException('The Loki query was aborted', 'AbortError');
  }
  if (response.errors?.length) {
    throw new Error(response.errors[0].message ?? 'Loki query failed');
  }

  return response.data;
};

export const fetchLokiFramesByTimeWindows = async (
  options: SplitQueryOptions,
  execute: QueryExecutor = executeLokiQuery
): Promise<DataFrame[]> => {
  const maxDepth = options.maxDepth ?? 8;
  const minimumWindowMs = options.minimumWindowMs ?? 1000;

  const fetchWindow = async (from: number, to: number, depth: number): Promise<DataFrame[]> => {
    const frames = await execute({ ...options, from, to });
    const lineCount = frames.reduce((total, frame) => total + frame.length, 0);
    if (lineCount < options.maxLines || depth >= maxDepth || to - from <= minimumWindowMs) {
      return frames;
    }

    const midpoint = Math.floor(from + (to - from) / 2);
    const [left, right] = await Promise.all([
      fetchWindow(from, midpoint, depth + 1),
      fetchWindow(midpoint + 1, to, depth + 1),
    ]);
    return [...left, ...right];
  };

  return fetchWindow(options.from, options.to, 0);
};

export const createLokiRequest = (options: LokiQueryOptions): DataQueryRequest<LokiQuery> => ({
  requestId: `faro-session-replay-${Date.now()}`,
  interval: '1s',
  intervalMs: 1000,
  maxDataPoints: options.maxLines,
  range: {
    from: dateTime(options.from),
    to: dateTime(options.to),
    raw: { from: new Date(options.from).toISOString(), to: new Date(options.to).toISOString() },
  },
  rangeRaw: { from: new Date(options.from).toISOString(), to: new Date(options.to).toISOString() },
  scopedVars: {},
  targets: [
    {
      refId: 'A',
      expr: options.expr,
      queryType: 'range',
      maxLines: options.maxLines,
      direction: 'forward',
      datasource: { uid: options.datasourceUid, type: 'loki' },
    },
  ],
  timezone: 'browser',
  app: CoreApp.Unknown,
  startTime: Date.now(),
});
