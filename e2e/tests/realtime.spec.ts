import { expect, test } from '@playwright/test';
import { client, login, toggleWindow, registerOfficer, reservationDates, resetCity, setLevel } from './helpers';

test.beforeEach(async ({ request }) => resetCity(request));

test('l’escalade et la désescalade sont diffusées à tous les clients', async ({ page, request }) => {
  await login(page, await registerOfficer(request, 'CD'));
  const alerts = await toggleWindow(page, 'Alertes', 'alerts');

  await setLevel(request, 'E', 4);
  await expect(page.getByTestId('city-level')).toContainText('Niveau 4');
  await expect(alerts.getByTestId('alert').first()).toContainText('Escalade E : niveau 1 → 4');

  await setLevel(request, 'E', 2);
  await expect(page.getByTestId('city-level')).toContainText('Niveau 2');
  await expect(alerts.getByTestId('alert').first()).toContainText('Désescalade E : niveau 4 → 2');
});

test('les changements de stock et les conflits sont poussés en direct', async ({ page, request }) => {
  const qcA = client(request, await registerOfficer(request, 'QC', 'A'));
  const qcZ = client(request, await registerOfficer(request, 'QC', 'Z'));
  const qcX = client(request, await registerOfficer(request, 'QC', 'X'));
  await setLevel(request, 'X', 3);

  await login(page, await registerOfficer(request, 'LC'));
  const alerts = await toggleWindow(page, 'Alertes', 'alerts');
  const sidebar = page.getByTestId('bo-sidebar');
  await sidebar.getByTestId('district-tab-X').click();
  const card = sidebar.getByTestId('stock-SHELTERS');

  await qcX.post('/api/reservations', { resource: 'SHELTERS', team_name: 'Delta', quantity: 2, ...reservationDates() });
  await expect(card.getByTestId('reserved')).toHaveText('2');

  await qcA.post('/api/transfers', { source: 'X', target: 'A', resource: 'MEDICAL', quantity: 1 });
  await qcZ.post('/api/transfers', { source: 'X', target: 'Z', resource: 'MEDICAL', quantity: 1 });
  await expect(alerts.getByTestId('alert').first()).toContainText('Conflit de ressource [X]');
});
