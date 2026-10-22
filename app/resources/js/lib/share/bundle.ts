/**
 * Attorney share bundles (P3.2). Shared by the app (which builds and encrypts
 * them) and the stand-alone viewer page (which decrypts them), so this file
 * depends on nothing but Web Crypto.
 *
 *   plain    u32 manifest length · manifest JSON · file bytes back to back
 *   sealed   12-byte IV · AES-256-GCM ciphertext of `plain`
 *
 * The 256-bit key is random per share and travels only in the link's
 * #fragment, which browsers never send to a server.
 */

export interface SharedIncident {
    incId: string;
    title: string;
    occurredAt: string;
    loggedAt: string;
    updatedAt: string;
    severity: string;
    types: string[];
    location: string;
    responsible: string[];
    witnesses: string[];
    othersAffected: string;
    description: string;
    context: string;
    frequency?: string;
    response: string;
    reported?: string;
    impacts: string[];
    impactStatement: string;
    evidenceCaptured: string[];
    additionalNotes: string;
    annotations: { at: string; text: string }[];
    hash: string;
    fileIds: string[];
}

export interface SharedFile {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    sha256: string;
    addedAt: string;
    offset: number;
}

export interface ShareManifest {
    format: 'resolvr-share';
    version: 1;
    createdAt: string;
    author?: string;
    note?: string;
    jurisdiction: string;
    incidents: SharedIncident[];
    files: SharedFile[];
}

const AAD = new TextEncoder().encode('resolvr-share:v1');

export function packBundle(
    manifest: Omit<ShareManifest, 'files'>,
    files: { meta: Omit<SharedFile, 'offset'>; bytes: Uint8Array }[],
): Uint8Array<ArrayBuffer> {
    let offset = 0;
    const metas: SharedFile[] = files.map(({ meta, bytes }) => {
        const m = { ...meta, offset };
        offset += bytes.length;
        return m;
    });
    const json = new TextEncoder().encode(JSON.stringify({ ...manifest, files: metas }));
    const out = new Uint8Array(4 + json.length + offset);
    new DataView(out.buffer).setUint32(0, json.length);
    out.set(json, 4);
    let at = 4 + json.length;
    for (const { bytes } of files) {
        out.set(bytes, at);
        at += bytes.length;
    }
    return out;
}

export function unpackBundle(plain: Uint8Array): { manifest: ShareManifest; file: (f: SharedFile) => Uint8Array } {
    const length = new DataView(plain.buffer, plain.byteOffset, plain.byteLength).getUint32(0);
    const manifest = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + length))) as ShareManifest;
    if (manifest.format !== 'resolvr-share' || manifest.version !== 1) throw new Error('Not a Resolvr share');
    const base = 4 + length;
    return { manifest, file: (f) => plain.subarray(base + f.offset, base + f.offset + f.size) };
}

export async function sealBundle(
    plain: Uint8Array<ArrayBuffer>,
): Promise<{ sealed: Uint8Array<ArrayBuffer>; key: string }> {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, plain));
    const sealed = new Uint8Array(12 + ct.length);
    sealed.set(iv);
    sealed.set(ct, 12);
    const encoded = toB64url(raw);
    raw.fill(0);
    return { sealed, key: encoded };
}

export async function openBundle(sealed: Uint8Array<ArrayBuffer>, keyText: string): Promise<Uint8Array<ArrayBuffer>> {
    const key = await crypto.subtle.importKey('raw', fromB64url(keyText), 'AES-GCM', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: sealed.subarray(0, 12), additionalData: AAD },
        key,
        sealed.subarray(12),
    );
    return new Uint8Array(plain);
}

export function toB64url(bytes: Uint8Array): string {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(text: string): Uint8Array<ArrayBuffer> {
    const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** The link to hand over. Everything after # stays in the browser. */
export const shareUrl = (origin: string, id: string, key: string) => `${origin}/s/${id}#${key}`;
