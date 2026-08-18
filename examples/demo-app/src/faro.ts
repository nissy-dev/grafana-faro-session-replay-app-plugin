import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { ReplayInstrumentation } from '@grafana/faro-instrumentation-replay';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const userId = `demo-${crypto.randomUUID().slice(0, 8)}`;

export const faro = initializeFaro({
  url: 'http://localhost:12347/collect',
  app: {
    name: 'northstar-supply-demo',
    version: '1.0.0',
    environment: 'development',
  },
  user: {
    id: userId,
    username: 'Demo shopper',
  },
  sessionTracking: {
    enabled: true,
    persistent: true,
    samplingRate: 1,
  },
  instrumentations: [
    ...getWebInstrumentations({ captureConsole: true }),
    // Turns fetch/XHR calls into spans and stamps trace context onto the logs and
    // events emitted while a span is active, which is what links the replay to Tempo.
    new TracingInstrumentation({
      instrumentationOptions: {
        propagateTraceHeaderCorsUrls: [/http:\/\/localhost:4173/],
      },
    }),
    new ReplayInstrumentation({
      samplingRate: 1,
      recordAfter: 'load',
      inactivityThresholdMs: 60_000,
      maskAllInputs: true,
      maskTextSelector: '.sensitive',
    }),
  ],
});

/**
 * Runs `work` inside an active span so that the fetch calls it makes become child
 * spans in Tempo, and the events it pushes carry the matching trace ID in Loki.
 */
export const withSpan = async <T>(name: string, work: () => Promise<T>): Promise<T> => {
  const otel = faro.api.getOTEL();
  if (!otel) {
    return work();
  }

  return otel.trace.getTracer('demo-app').startActiveSpan(name, async (span) => {
    try {
      return await work();
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
};
