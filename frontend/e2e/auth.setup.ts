import fs from 'node:fs';
import path from 'node:path';
import { test as setup, expect } from '@playwright/test';

const authFile = path.join(__dirname, '..', '.playwright', 'auth', 'admin.json');

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL || 'admin@demo.lexai';
  const password = process.env.E2E_ADMIN_PASSWORD || 'password123';

  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /log in/i }).click();

  await page.waitForURL('**/app/dashboard', { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.context().storageState({ path: authFile });
});

