import { APIRequestContext, APIResponse, Page, expect } from '@playwright/test';

export type Role = 'QC' | 'LC' | 'CD';

export interface Officer {
  username: string;
  password: string;
  token: string;
}

const GOD_MODE_PASSWORD = process.env.GOD_MODE_PASSWORD ?? '';
let sequence = 0;

export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${sequence++}`;
}

export async function registerOfficer(request: APIRequestContext, role: Role, district: string | null = null): Promise<Officer> {
  const username = uniqueName(role.toLowerCase());
  const password = 'password-e2e';
  const response = await request.post('/api/auth/register', { data: { username, password, role, district } });
  expect(response.status()).toBe(201);
  return { username, password, token: (await response.json()).token };
}

export async function resetCity(request: APIRequestContext): Promise<void> {
  expect((await request.post('/api/god-mode/reset', { data: { password: GOD_MODE_PASSWORD } })).status()).toBe(204);
}

export async function setLevel(request: APIRequestContext, district: string, level: number): Promise<void> {
  const response = await request.post('/api/god-mode/disasters', {
    data: { password: GOD_MODE_PASSWORD, district, disaster_type: 'EARTHQUAKE', level }
  });
  expect(response.status()).toBe(201);
}

export function client(request: APIRequestContext, officer: Officer) {
  const headers = { Authorization: `Bearer ${officer.token}` };
  return {
    get: (url: string) => request.get(url, { headers }),
    post: (url: string, data?: object) => request.post(url, { headers, data })
  };
}

export async function expectError(response: APIResponse, status: number, code: string): Promise<void> {
  expect(response.status()).toBe(status);
  expect((await response.json()).error_code).toBe(code);
}

export async function login(page: Page, officer: Officer): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Identifiant').fill(officer.username);
  await page.getByLabel('Mot de passe').fill(officer.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByTestId('current-user')).toContainText(officer.username);
}

export async function toggleWindow(page: Page, name: string, id: string) {
  await page.getByRole('banner').getByRole('button', { name }).click();
  return page.getByTestId(`window-${id}`);
}

export function reservationDates() {
  const start = new Date();
  return { starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 3600000).toISOString() };
}
