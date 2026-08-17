import { test, expect } from './fixtures';

test('should be possible to save app configuration', async ({ appConfigPage, page }) => {
  const saveButton = page.getByRole('button', { name: /Save settings/i });

  await page.getByRole('spinbutton', { name: 'Default time range' }).fill('48');
  await page.getByRole('spinbutton', { name: 'Maximum lines per query' }).fill('2500');

  // listen for the server response on the saved form
  const saveResponse = appConfigPage.waitForSettingsResponse();

  await saveButton.click();
  await expect(saveResponse).toBeOK();
});
