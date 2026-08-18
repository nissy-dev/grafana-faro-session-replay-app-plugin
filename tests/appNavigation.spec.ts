import { test, expect } from './fixtures';
import { ROUTES } from '../src/constants';
import { SEEDED_SESSION_ID, seedRecordedSession } from './seedLoki';

test.describe('navigating app', () => {
  test('session list should render successfully', async ({ gotoPage, page }) => {
    await seedRecordedSession();

    await gotoPage(`/${ROUTES.Sessions}`);
    await expect(page.getByRole('heading', { name: 'Faro Session Replay', exact: true }).last()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Session ID' })).toBeVisible();
    await expect(page.getByRole('cell', { name: SEEDED_SESSION_ID })).toBeVisible();
  });

  test('shared session URL restores the selected session', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Sessions}/session-123?from=1700000000000&to=1700003600000`);
    await expect(page.getByRole('heading', { name: 'Session replay', exact: true })).toBeVisible();
    await expect(page.getByText('session-123')).toBeVisible();
  });
});
