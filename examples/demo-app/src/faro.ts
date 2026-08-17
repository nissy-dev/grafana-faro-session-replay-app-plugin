import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { ReplayInstrumentation } from '@grafana/faro-instrumentation-replay';

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
    new ReplayInstrumentation({
      samplingRate: 1,
      recordAfter: 'load',
      inactivityThresholdMs: 60_000,
      maskAllInputs: true,
      maskTextSelector: '.sensitive',
    }),
  ],
});
