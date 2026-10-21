import { describe, expect, it, vi } from 'vitest';

import { submitWaitlist, validEmail } from './waitlist';

describe('validEmail', () => {
    it.each(['a@b.co', 'name.surname+tag@example.org'])('accepts %s', (email) => expect(validEmail(email)).toBe(true));
    it.each(['', 'name@', 'name@example', 'no spaces@x.com'])('rejects %s', (email) =>
        expect(validEmail(email)).toBe(false),
    );
});

describe('submitWaitlist', () => {
    const respond = (status: number) => vi.fn().mockResolvedValue(new Response('{}', { status }));

    it('posts JSON to the app API without credentials', async () => {
        const fetcher = respond(201);
        await submitWaitlist(' a@b.co ', '', fetcher);
        const [url, init] = fetcher.mock.calls[0]!;
        expect(url).toMatch(/\/api\/waitlist$/);
        expect(init.credentials).toBe('omit');
        expect(JSON.parse(init.body)).toMatchObject({ email: 'a@b.co', company: '' });
    });

    it('maps server responses to calm messages', async () => {
        expect(await submitWaitlist('a@b.co', '', respond(201))).toEqual({ ok: true });
        expect(await submitWaitlist('a@b.co', '', respond(422))).toMatchObject({ ok: false });
        expect(await submitWaitlist('a@b.co', '', respond(429))).toMatchObject({
            message: expect.stringContaining('wait'),
        });
        expect(await submitWaitlist('a@b.co', '', vi.fn().mockRejectedValue(new TypeError('offline')))).toMatchObject({
            message: expect.stringContaining('offline'),
        });
    });
});
