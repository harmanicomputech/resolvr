/** Byte helpers shared by the crypto and storage layers. */

export const utf8 = {
    encode: (text: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(text),
    decode: (bytes: BufferSource): string => new TextDecoder().decode(bytes),
};

export function toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
}

export function toHex(buffer: ArrayBuffer | Uint8Array): string {
    return Array.from(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer), (b) =>
        b.toString(16).padStart(2, '0'),
    ).join('');
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
    return crypto.getRandomValues(new Uint8Array(length));
}
