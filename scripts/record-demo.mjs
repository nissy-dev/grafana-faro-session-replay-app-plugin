/**
 * Records the README demo against the local docker compose stack.
 *
 *   pnpm run server        # in another terminal, wait for Grafana to come up
 *   node scripts/record-demo.mjs
 *
 * It drives the demo storefront so Faro records a fresh session, then replays that
 * session in the plugin while recording the browser. Outputs a WebM video and a
 * poster screenshot into docs/media/.
 */
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const GRAFANA_URL = process.env.GRAFANA_URL ?? 'http://localhost:3000';
const DEMO_URL = process.env.DEMO_URL ?? 'http://localhost:4173';
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? 'docs/media';
const PLUGIN_ID = 'nissydev-farosessionreplay-app';
const VIEWPORT = { width: 1440, height: 900 };

const browser = await chromium.launch();

try {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await removeStaleRecordings();
  await recordSession();
  await captureReplay();
} finally {
  await browser.close();
}

/** Playwright names its recordings after the page, and leaves them behind when a run fails. */
async function removeStaleRecordings() {
  const leftovers = (await readdir(OUTPUT_DIR)).filter((name) => name.startsWith('page@'));
  await Promise.all(leftovers.map((name) => rm(`${OUTPUT_DIR}/${name}`, { force: true })));
}

/** Clicks through the storefront so Faro produces a replay, events and fetch traces. */
async function recordSession() {
  console.log('recording a session in the demo app');
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  await page.goto(DEMO_URL);
  await page.waitForTimeout(2000);

  await page.getByPlaceholder('Search gear').fill('trail');
  await page.waitForTimeout(1200);
  await page.getByPlaceholder('Search gear').fill('');
  await page.waitForTimeout(800);

  for (const index of [0, 2]) {
    await page.locator('article button').nth(index).click();
    await page.waitForTimeout(900);
  }

  await page.getByRole('link', { name: 'Field notes' }).click();
  await page.waitForTimeout(1200);
  await page.getByPlaceholder('you@example.com').fill('shopper@example.com');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Join' }).click();
  await page.waitForTimeout(1200);

  await page.getByLabel('Open cart').click();
  await page.waitForTimeout(1200);
  await page
    .getByRole('button', { name: /^Add one/ })
    .first()
    .click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Demo checkout' }).click();
  await page.waitForTimeout(2500);

  await context.close();

  // Faro batches its payloads and Loki needs a moment before the session is queryable.
  console.log('waiting for the telemetry to reach Loki');
  await new Promise((resolve) => setTimeout(resolve, 15_000));
}

/** Replays the newest session in the plugin while recording the browser. */
async function captureReplay() {
  console.log('recording the plugin');
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: OUTPUT_DIR, size: VIEWPORT },
  });
  const page = await context.newPage();

  await page.goto(`${GRAFANA_URL}/login`);
  await page.locator('input[name="user"]').fill('admin');
  await page.locator('input[name="password"]').fill('admin');
  // Grafana routes client side after logging in, so wait on the request rather than a navigation.
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/login') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Log in' }).click(),
  ]);

  await page.goto(`${GRAFANA_URL}/a/${PLUGIN_ID}/sessions`);
  await page.getByRole('columnheader', { name: 'Session ID' }).waitFor();
  // Reclaim the space the docked navigation takes up.
  await page
    .getByRole('button', { name: 'Close menu' })
    .click({ trial: false })
    .catch(() => {});
  await page.waitForTimeout(2000);

  await page.getByRole('row').nth(1).click();
  await page.getByRole('button', { name: 'Play' }).waitFor();
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Play' }).click();
  // The player only paints the recorded page once playback starts, so let it run before the poster.
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUTPUT_DIR}/session-replay.png` });

  // Playback swaps the button back to "Play" when it reaches the end.
  await page.getByRole('button', { name: 'Play' }).waitFor({ timeout: 90_000 });

  const trace = page.getByRole('link', { name: 'Trace' }).first();
  if (await trace.count()) {
    await trace.hover();
    await page.waitForTimeout(2500);
  }

  const video = page.video();
  await context.close();

  const recorded = await video?.path();
  if (recorded) {
    await rm(`${OUTPUT_DIR}/session-replay.webm`, { force: true });
    await rename(recorded, `${OUTPUT_DIR}/session-replay.webm`);
    console.log(`wrote ${OUTPUT_DIR}/session-replay.webm`);
  }
}
