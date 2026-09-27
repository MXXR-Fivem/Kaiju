import { expect, test } from '@playwright/test';
import { login, toggleWindow, registerOfficer, resetCity, setLevel } from './helpers';

test.beforeEach(async ({ request }) => resetCity(request));

test('un QC réserve puis restitue une ressource de son quartier', async ({ page, request }) => {
  const qc = await registerOfficer(request, 'QC', 'A');
  await setLevel(request, 'A', 2);
  await login(page, qc);

  const reservations = await toggleWindow(page, 'Réservations', 'reservations');
  await reservations.getByLabel('Équipe', { exact: true }).fill('Bravo');
  await reservations.getByLabel('Ressource').selectOption('RESCUE');
  await reservations.getByLabel('Quantité').fill('3');
  await reservations.getByRole('button', { name: 'Réserver' }).click();
  await expect(reservations.getByTestId('reservation-card')).toContainText('Bravo · 3 × Équipes de secours');

  const calendar = await toggleWindow(page, 'Calendrier', 'calendar');
  await expect(calendar.getByTestId('calendar-event').first()).toContainText('Bravo');
  await toggleWindow(page, 'Calendrier', 'calendar');

  await reservations.getByRole('button', { name: 'Restituer' }).click();
  await expect(reservations.getByTestId('reservation-card')).toHaveCount(0);
});

test('une réservation qui dépasse le disponible est refusée', async ({ page, request }) => {
  const qc = await registerOfficer(request, 'QC', 'A');
  await setLevel(request, 'A', 2);
  await login(page, qc);

  const reservations = await toggleWindow(page, 'Réservations', 'reservations');
  await reservations.getByLabel('Équipe', { exact: true }).fill('Charlie');
  await reservations.getByLabel('Ressource').selectOption('RESCUE');
  await reservations.getByLabel('Quantité').fill('5');
  await reservations.getByRole('button', { name: 'Réserver' }).click();
  await expect(reservations.getByTestId('reservation-error')).toContainText('RESOURCE_CONFLICT');
});

test('demande adjacente : demande, approbation en temps réel puis réception', async ({ browser, request }) => {
  const qcA = await registerOfficer(request, 'QC', 'A');
  const qcX = await registerOfficer(request, 'QC', 'X');
  await setLevel(request, 'A', 3);

  const requester = await (await browser.newContext()).newPage();
  const supplier = await (await browser.newContext()).newPage();
  await login(requester, qcA);
  await login(supplier, qcX);

  const transfers = await toggleWindow(requester, 'Transferts', 'transfers');
  await transfers.getByRole('button', { name: '+ Nouvelle demande' }).click();
  await transfers.getByLabel('Quartier source').selectOption('X');
  await transfers.getByLabel('Ressource').selectOption('MEDICAL');
  await transfers.getByLabel('Quantité').fill('3');
  await transfers.getByRole('button', { name: 'Envoyer la demande' }).click();
  await expect(transfers.getByTestId('transfer-error')).toContainText('RETENTION_VIOLATION');

  await transfers.getByLabel('Quantité').fill('2');
  await transfers.getByRole('button', { name: 'Envoyer la demande' }).click();
  await expect(transfers.getByTestId('transfer-card').first()).toContainText('PENDING');

  const review = supplier.getByTestId('window-dashboard').getByTestId('review-card');
  await expect(review).toContainText('2 × Personnel médical · X → A');
  await review.getByRole('button', { name: 'Approuver' }).click();

  await expect(transfers.getByTestId('transfer-card').first()).toContainText('IN_TRANSIT');
  await transfers.getByRole('button', { name: 'Confirmer la réception' }).click();
  await expect(transfers.getByTestId('transfer-card').first()).toContainText('DELIVERED');

  const sidebar = supplier.getByTestId('bo-sidebar');
  await sidebar.getByTestId('district-tab-A').click();
  await expect(sidebar.getByTestId('stock-MEDICAL').getByTestId('current')).toHaveText('14');
  await sidebar.getByTestId('district-tab-X').click();
  await expect(sidebar.getByTestId('stock-MEDICAL').getByTestId('current')).toHaveText('1');
});
