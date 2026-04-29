import { test, expect } from '@playwright/test';

function apiBase() {
  const base = process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  return base.replace(/\/$/, '');
}

test('app pages load (contracts, analytics, audit) and audit export works', async ({ page, request }) => {
  const token = process.env.E2E_PORTAL_TOKEN;
  test.skip(!token, 'E2E_PORTAL_TOKEN is required (run seed_demo and copy the printed token).');

  const portalRes = await request.get(`${apiBase()}/portal/${encodeURIComponent(token!)}/`);
  expect(portalRes.ok()).toBeTruthy();
  const portal = (await portalRes.json()) as any;
  const documentId = portal?.documents?.[0]?.id as string | undefined;
  expect(documentId).toBeTruthy();

  await page.goto(`/app/contracts/${documentId}`);
  await expect(page.getByText('Clauses')).toBeVisible();
  await expect(page.getByText('Confidentiality')).toBeVisible();

  await page.goto('/app/analytics');
  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
  await expect(page.getByText('Clause risk distribution')).toBeVisible();

  await page.goto('/app/admin/audit');
  await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
  await expect(page.getByText('Events')).toBeVisible();

  const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
  expect(accessToken).toBeTruthy();

  const exportRes = await page.request.get(`${apiBase()}/audit/export/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(exportRes.ok()).toBeTruthy();
  const csv = await exportRes.text();
  expect(csv.toLowerCase()).toContain('action');
});

