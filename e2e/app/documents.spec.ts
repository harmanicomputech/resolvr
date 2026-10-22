import { expect, test, type Route } from '@playwright/test';
import { readFile } from 'node:fs/promises';

import { importSample, onboard, unlock } from './helpers';

const sse = (events: [string, object][]) => events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('');

test('document studio: preview what is sent, stream a draft, rewrite, export', async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1280, height: 900 });
    await onboard(page);
    await importSample(page);

    const sent: Record<string, unknown>[] = [];
    await page.route('**/ai/complaint', async (route: Route) => {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        sent.push(body);
        expect(route.request().headers()['x-xsrf-token']).toBeTruthy();
        const text = body.mode === 'rewrite' ? 'This paragraph has been rewritten more firmly.' : 'Subject: Formal complaint about J. Smith\n\nDear HR team,\n\nI am writing to make a formal complaint.\n\nYours sincerely,\nSam';
        await route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse([['start', {}], ...text.match(/.{1,12}/gs)!.map((t) => ['delta', { text: t }] as [string, object]), ['done', { stopReason: 'end_turn' }]]) });
    });

    await page.getByRole('navigation').getByRole('link', { name: 'Documents' }).click();
    await page.getByRole('link', { name: /HR complaint/ }).click();
    const settings = page.getByRole('complementary', { name: 'Draft settings' });
    await settings.getByLabel('Your name').fill('Sam Doe');

    await settings.getByText('What will be sent').click();
    const preview = settings.locator('pre');
    await expect(preview).toContainText('INC-009');
    await expect(preview).toContainText('J. Smith');
    await settings.getByRole('button', { name: 'Names of people involved' }).click();
    await expect(preview).not.toContainText('J. Smith');

    await settings.getByRole('button', { name: 'Draft it' }).click();
    const doc = page.getByRole('textbox', { name: 'Document text' });
    await expect(doc).toContainText('I am writing to make a formal complaint.');
    await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}$/);
    expect(sent[0]).toMatchObject({ mode: 'document', type: 'hr-complaint', details: { fullName: 'Sam Doe' } });
    expect(JSON.stringify(sent[0])).not.toContain('J. Smith');

    // Rewrite the paragraph at the cursor.
    await expect(doc).toHaveAttribute('contenteditable', 'true');
    await doc.getByText('I am writing to make a formal complaint.').click();
    await page.getByLabel('Rewrite the paragraph at the cursor').selectOption('Make it firmer');
    await page.getByRole('button', { name: 'Use this' }).click();
    await expect(doc).toContainText('This paragraph has been rewritten more firmly.');
    expect(sent[1]).toMatchObject({ mode: 'rewrite', paragraph: 'I am writing to make a formal complaint.' });

    const pdf = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF' }).click();
    expect((await readFile((await (await pdf).path())!)).subarray(0, 4).toString()).toBe('%PDF');
    const word = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Word' }).click();
    const wordFile = await word;
    expect(wordFile.suggestedFilename()).toMatch(/\.docx$/);
    expect((await readFile((await wordFile.path())!)).subarray(0, 2).toString()).toBe('PK');

    await page.getByRole('link', { name: 'Documents' }).first().click();
    await expect(page.getByRole('region', { name: 'Saved drafts' }).or(page.locator('#saved-docs').locator('..')).getByText(/HR complaint,/)).toBeVisible();
    expect(errors).toEqual([]);
});

test('a refusal leaves the editor as it was and explains', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await onboard(page);
    await importSample(page);
    await page.route('**/ai/complaint', (route) => route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse([['delta', { text: 'Partial' }], ['refused', {}]]) }));
    await page.goto('/documents/new?type=witness-request');
    await unlock(page);
    await page.getByRole('button', { name: 'Draft it' }).click();
    await expect(page.getByText('This one could not be drafted automatically.', { exact: false })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Document text' })).not.toContainText('Partial');
});
