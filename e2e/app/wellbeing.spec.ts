import { expect, test } from '@playwright/test';

import { go, onboard } from './helpers';

test('optional daily check-in: invite, dashboard prompt, trend and support', async ({ page }) => {
    test.setTimeout(90_000);
    await onboard(page);
    await go(page, 'Wellbeing');
    await expect(page.getByRole('heading', { name: 'A quiet daily check-in' })).toBeVisible();
    await expect(page.getByText('988 Suicide & Crisis Lifeline')).toBeVisible();
    await page.getByRole('button', { name: 'Turn on' }).click();
    await expect(page.getByRole('heading', { name: 'How are you today?' })).toBeVisible();

    await go(page, 'Home');
    const prompt = page.getByRole('region', { name: 'How are you today?' });
    await prompt.getByText('Low', { exact: true }).click();
    await prompt.getByLabel('One line about today (optional)').fill('Quiet day, still tense');
    await prompt.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Thank you for checking in.')).toBeVisible();
    await expect(prompt).toHaveCount(0);

    await go(page, 'Wellbeing');
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Low', exact: true })).toBeChecked();
    await expect(page.getByText('1 check-in shown.')).toBeVisible();
    await expect(page.getByText('Quiet day, still tense', { exact: true })).toBeVisible();
    await expect(page.getByText(/streak/i)).toHaveCount(0);
});
