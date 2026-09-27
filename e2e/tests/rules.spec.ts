import { expect, test } from '@playwright/test';
import { client, expectError, registerOfficer, reservationDates, resetCity, setLevel } from './helpers';

test.beforeEach(async ({ request }) => resetCity(request));

test('la matrice des permissions est appliquée par niveau et par rôle', async ({ request }) => {
  const qcA = client(request, await registerOfficer(request, 'QC', 'A'));
  const lc = client(request, await registerOfficer(request, 'LC'));
  const cd = client(request, await registerOfficer(request, 'CD'));
  const reservation = { resource: 'MEDICAL', team_name: 'Alpha', quantity: 1, ...reservationDates() };
  const adjacent = { source: 'X', target: 'A', resource: 'SHELTERS', quantity: 1 };

  await expectError(await qcA.post('/api/reservations', reservation), 423, 'DISASTER_LEVEL_RESTRICTED');
  await setLevel(request, 'A', 2);
  expect((await qcA.post('/api/reservations', reservation)).status()).toBe(201);
  await expectError(await lc.post('/api/reservations', reservation), 403, 'PERMISSION_DENIED');
  await expectError(await qcA.post('/api/transfers', adjacent), 423, 'DISASTER_LEVEL_RESTRICTED');

  await setLevel(request, 'A', 3);
  await expectError(await lc.post('/api/transfers', adjacent), 403, 'PERMISSION_DENIED');
  await expectError(await cd.post('/api/transfers', { ...adjacent, requisition: true }), 423, 'DISASTER_LEVEL_RESTRICTED');

  await setLevel(request, 'A', 4);
  expect((await lc.post('/api/transfers', adjacent)).status()).toBe(201);
  const requisition = await cd.post('/api/transfers', { ...adjacent, requisition: true });
  expect(await requisition.json()).toMatchObject({ status: 'IN_TRANSIT', is_requisition: true });
  await expectError(await cd.post('/api/retention/lower'), 423, 'DISASTER_LEVEL_RESTRICTED');

  await setLevel(request, 'A', 5);
  await expectError(await lc.post('/api/retention/lower'), 403, 'PERMISSION_DENIED');
  expect((await cd.post('/api/retention/lower')).status()).toBe(204);
  const stocks = await (await cd.get('/api/stocks')).json();
  expect(stocks.find((s: any) => s.district_code === 'A' && s.resource_code === 'MEDICAL').min_retained).toBe(2);
});

test('rétention, adjacence et priorité aux quartiers adjacents', async ({ request }) => {
  const qcA = client(request, await registerOfficer(request, 'QC', 'A'));
  const lc = client(request, await registerOfficer(request, 'LC'));
  await setLevel(request, 'Z', 4);

  await expectError(
    await qcA.post('/api/transfers', { source: 'X', target: 'A', resource: 'MEDICAL', quantity: 3 }),
    422,
    'RETENTION_VIOLATION'
  );
  await expectError(
    await qcA.post('/api/transfers', { source: 'X', target: 'A', resource: 'MEDICAL', quantity: 1, route: 'SEA' }),
    412,
    'ADJACENCY_VIOLATION'
  );
  await expectError(
    await lc.post('/api/transfers', { source: 'A', target: 'Z', resource: 'MEDICAL', quantity: 4 }),
    424,
    'ADJACENCY_PRIORITY'
  );
  const chain = await (await lc.post('/api/transfers', { source: 'A', target: 'Z', resource: 'MEDICAL', quantity: 6 })).json();
  expect(chain).toMatchObject({ transit_code: 'W', status: 'PENDING', duration_minutes: 60 });
});

test('une chaîne de transit exige l’accord du quartier source et du quartier de transit', async ({ request }) => {
  const qcA = client(request, await registerOfficer(request, 'QC', 'A'));
  const qcW = client(request, await registerOfficer(request, 'QC', 'W'));
  const lc = client(request, await registerOfficer(request, 'LC'));
  await setLevel(request, 'Z', 4);

  const chain = await (await lc.post('/api/transfers', { source: 'A', target: 'Z', resource: 'MEDICAL', quantity: 6 })).json();
  await expectError(await lc.post(`/api/transfers/${chain.id}/review`, { approved: true }), 403, 'PERMISSION_DENIED');
  expect(await (await qcW.post(`/api/transfers/${chain.id}/review`, { approved: true })).json()).toMatchObject({
    status: 'PENDING',
    transit_approved: true
  });
  expect(await (await qcA.post(`/api/transfers/${chain.id}/review`, { approved: true })).json()).toMatchObject({
    status: 'IN_TRANSIT'
  });
});

test('un transit par Xeno attend que Xeno ait couvert ses propres besoins', async ({ request }) => {
  const qcE = client(request, await registerOfficer(request, 'QC', 'E'));
  const qcX = client(request, await registerOfficer(request, 'QC', 'X'));
  const lc = client(request, await registerOfficer(request, 'LC'));
  await setLevel(request, 'X', 4);

  expect((await qcX.post('/api/transfers', { source: 'A', target: 'X', resource: 'RESCUE', quantity: 1 })).status()).toBe(201);
  const chain = await (
    await lc.post('/api/transfers', { source: 'E', target: 'Z', resource: 'RESCUE', quantity: 5, route: 'LAND' })
  ).json();
  expect(chain.transit_code).toBe('X');
  expect((await qcE.post(`/api/transfers/${chain.id}/review`, { approved: true })).status()).toBe(200);
  await expectError(await qcX.post(`/api/transfers/${chain.id}/review`, { approved: true }), 425, 'XENO_PRIORITY');
});
