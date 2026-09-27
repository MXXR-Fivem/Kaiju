import { expect, test } from '@playwright/test';
import { expectError, uniqueName } from './helpers';

test('un officier s’inscrit, se déconnecte puis se reconnecte', async ({ page }) => {
  const username = uniqueName('qc');

  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'Inscription' }).click();
  await page.getByLabel('Identifiant').fill(username);
  await page.getByLabel('Mot de passe').fill('password-e2e');
  await page.getByLabel('Rôle').selectOption('QC');
  await page.getByRole('combobox', { name: /^Quartier/ }).selectOption('E');
  await page.getByRole('button', { name: 'Créer le compte' }).click();

  await expect(page.getByTestId('dashboard-role')).toContainText('Coordinateur de quartier');
  await expect(page.getByTestId('current-user')).toContainText(`[QC · E] ${username}`);

  await page.getByRole('button', { name: 'Déconnexion' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/login');

  await page.getByLabel('Identifiant').fill(username);
  await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('alert')).toContainText('UNAUTHORIZED');

  await page.getByLabel('Mot de passe').fill('password-e2e');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByTestId('dashboard')).toBeVisible();
});

test('les données exigent une session valide', async ({ request }) => {
  await expectError(await request.get('/api/stocks'), 401, 'UNAUTHORIZED');
  await expectError(await request.get('/api/stocks', { headers: { Authorization: 'Bearer faux' } }), 401, 'UNAUTHORIZED');
});
