import { describe, expect, it } from 'vitest';

import { appendLink, canonicalJson, sha256Hex, verifyChain } from '.';

describe('canonicalJson', () => {
    it('is independent of key order and drops undefined', () => {
        expect(canonicalJson({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: undefined } })).toBe(
            '{"a":{"d":[1,{"x":1,"y":2}]},"b":1}',
        );
        expect(canonicalJson({ x: 1, y: 2 })).toBe(canonicalJson({ y: 2, x: 1 }));
    });
});

describe('sha256Hex', () => {
    it('matches the standard test vector', async () => {
        expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    });
});

describe('hash chain', () => {
    it('verifies an intact chain and finds reordering', async () => {
        const one = await appendLink(undefined, { n: 1 });
        const two = await appendLink(one, { n: 2 });
        const three = await appendLink(two, { n: 3 });
        expect(await verifyChain([one, two, three])).toMatchObject({ ok: true, length: 3, head: three.hash });
        expect(await verifyChain([one, three, two])).toMatchObject({ ok: false });
    });
});
