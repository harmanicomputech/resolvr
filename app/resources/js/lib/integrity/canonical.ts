/**
 * Deterministic JSON: object keys sorted, no whitespace, undefined dropped.
 * The same value always produces the same string, so its hash is stable
 * across devices, browsers and future versions of the app.
 */
export function canonicalJson(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        if (typeof value === 'number' && !Number.isFinite(value))
            throw new TypeError('Non-finite numbers cannot be hashed');
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : canonicalJson(v))).join(',')}]`;
    const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

export async function sha256Hex(data: string | BufferSource): Promise<string> {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
