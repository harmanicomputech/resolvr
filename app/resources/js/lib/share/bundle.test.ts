import { expect, test } from 'vitest';

import { openBundle, packBundle, sealBundle, unpackBundle } from './bundle';

const manifest = {
    format: 'resolvr-share' as const,
    version: 1 as const,
    createdAt: '2026-10-22T10:00:00.000Z',
    jurisdiction: 'United Kingdom',
    incidents: [],
};

test('round-trips a sealed bundle with files', async () => {
    const files = [
        {
            meta: { id: 'a', name: 'a.txt', mimeType: 'text/plain', size: 3, sha256: 'x'.repeat(64), addedAt: '' },
            bytes: new Uint8Array([1, 2, 3]),
        },
        {
            meta: {
                id: 'b',
                name: 'b.bin',
                mimeType: 'application/octet-stream',
                size: 2,
                sha256: 'y'.repeat(64),
                addedAt: '',
            },
            bytes: new Uint8Array([9, 8]),
        },
    ];
    const { sealed, key } = await sealBundle(packBundle(manifest, files));
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const { manifest: m, file } = unpackBundle(await openBundle(sealed, key));
    expect(m.jurisdiction).toBe('United Kingdom');
    expect([...file(m.files[1]!)]).toEqual([9, 8]);
    expect([...file(m.files[0]!)]).toEqual([1, 2, 3]);
});

test('a wrong key or altered byte fails', async () => {
    const { sealed, key } = await sealBundle(packBundle(manifest, []));
    const other = (await sealBundle(packBundle(manifest, []))).key;
    await expect(openBundle(sealed, other)).rejects.toThrow();
    sealed[20] = sealed[20]! ^ 1;
    await expect(openBundle(sealed, key)).rejects.toThrow();
});
