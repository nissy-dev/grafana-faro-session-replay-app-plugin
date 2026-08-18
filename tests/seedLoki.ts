const LOKI_URL = process.env.LOKI_URL ?? 'http://localhost:3100';

export const SEEDED_SESSION_ID = 'e2e-session-1';

/**
 * Pushes a Faro recording start marker to Loki so the session list has something to render.
 * The docker compose stack starts with an empty Loki, and nothing drives the demo app during e2e.
 */
export const seedRecordedSession = async (sessionId: string = SEEDED_SESSION_ID): Promise<void> => {
  const timestamp = Date.now();
  const line = JSON.stringify({
    kind: 'event',
    event_name: 'faro.session_recording.started',
    session_id: sessionId,
    app_name: 'e2e-app',
    app_environment: 'e2e',
    user_email: 'e2e@example.com',
    browser_name: 'Chrome',
    browser_version: '131.0',
    page_url: 'http://localhost:4173/',
    timestamp: new Date(timestamp).toISOString(),
  });

  const response = await fetch(`${LOKI_URL}/loki/api/v1/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      streams: [{ stream: { kind: 'event' }, values: [[`${timestamp}000000`, line]] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to seed Loki (${response.status}): ${await response.text()}`);
  }
};
