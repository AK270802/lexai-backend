import { test, expect } from '@playwright/test';

test('client portal opens and can acknowledge', async ({ page }) => {
  const token = process.env.E2E_PORTAL_TOKEN;
  test.skip(!token, 'E2E_PORTAL_TOKEN is required (run seed_demo and copy the printed token).');

  await page.goto(`/client/${token}`);

  await expect(page.getByText('Client Portal')).toBeVisible();
  await expect(page.getByText('Read-only review')).toBeVisible();
  await expect(page.getByText('Acme ↔ Contoso NDA Review')).toBeVisible();
  await expect(page.getByText('Sample NDA.pdf')).toBeVisible();

  await page.getByPlaceholder('Your name (optional)').fill('Demo Client');
  await page.getByPlaceholder('Email (optional)').fill('client@example.com');
  await page.getByRole('button', { name: 'Acknowledge review' }).click();
  await expect(page.getByText('Acknowledged')).toBeVisible();
});

