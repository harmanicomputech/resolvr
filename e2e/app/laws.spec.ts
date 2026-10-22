import { expect, test } from '@playwright/test';

import { go, importSample, onboard } from './helpers';

test('time limits, plain-language law notes, and switching jurisdiction', async ({ page }) => {
    test.setTimeout(90_000);
    await onboard(page);
    await importSample(page);

    const limits = page.getByRole('region', { name: 'Time limits' });
    await expect(limits.getByTestId('deadline-days')).toHaveText(/About \d+ days|Today/);
    await expect(limits.getByText('File a charge with the EEOC')).toBeVisible();
    await expect(limits.getByRole('link', { name: /Talk to a lawyer/ })).toHaveAttribute('href', /^https:\/\//);
    await expect(limits.getByText(/not legal advice/)).toBeVisible();

    await page.getByRole('button', { name: /Title VII\s*: Civil Rights Act of 1964, Title VII, may be relevant/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Civil Rights Act of 1964, Title VII' });
    await expect(dialog.getByText(/race, colour, religion, sex/)).toBeVisible();
    await expect(dialog.getByRole('link', { name: /EEOC/ })).toBeVisible();
    await page.keyboard.press('Escape');

    await go(page, 'Settings');
    await page.locator('#jurisdiction').getByText('United Kingdom').click();
    await go(page, 'Home');
    await expect(page.getByRole('button', { name: /Equality Act 2010\s*, may be relevant/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Time limits' }).getByText(/Acas/).first()).toBeVisible();
});
