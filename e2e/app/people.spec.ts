import { expect, test } from '@playwright/test';

import { importSample, onboard } from './helpers';

test('people directory: suggestions, merge and witness statements', async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1280, height: 900 });
    await onboard(page);
    await importSample(page);

    // Log one more incident that names "John Smith".
    await page.getByRole('complementary', { name: 'Main' }).getByRole('button', { name: 'Log incident' }).click();
    const flow = page.getByRole('dialog', { name: 'Log an incident' });
    await flow.getByLabel('Short title').fill('Raised voice in corridor');
    await flow.getByLabel('What happened?').fill('He raised his voice at me in the corridor.');
    await flow.getByRole('button', { name: 'Next' }).click();
    await flow.getByRole('button', { name: 'Verbal Harassment' }).click();
    await flow.getByRole('button', { name: 'Next' }).click();
    await flow.getByRole('button', { name: 'Medium', exact: true }).click();
    await flow.getByRole('button', { name: 'Next' }).click();
    await flow.getByRole('combobox', { name: 'Who was responsible?' }).fill('John Smith');
    await flow.getByRole('combobox', { name: 'Who was responsible?' }).press('Enter');
    await flow.getByRole('button', { name: 'Review', exact: true }).click();
    await flow.getByRole('button', { name: 'Lock and save' }).click();
    await flow.getByRole('button', { name: 'Done' }).click();

    await page.getByRole('navigation').getByRole('link', { name: 'People' }).click();
    await expect(page.getByText('the same person?')).toBeVisible();
    await page.getByRole('button', { name: 'Merge' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Merge two people' });
    await dialog.getByLabel('Keep this name').selectOption({ label: 'John Smith' });
    await dialog.getByRole('button', { name: 'Merge' }).click();
    await expect(page.getByText(/Merged into John Smith/)).toBeVisible();
    await expect(page.getByRole('link', { name: /John Smith/ })).toContainText('Responsible in 10');

    await page.getByRole('link', { name: /Ann Lee/ }).click();
    await expect(page.getByRole('heading', { name: 'As a witness' })).toBeVisible();
    await page.getByLabel(/Statement for INC-001/).selectOption('requested');
    await expect(page.getByText('Statement status saved')).toBeVisible();
    expect(errors).toEqual([]);
});
