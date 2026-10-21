import { fromBase64, keyFromSecret, randomBytes, toBase64 } from '@/lib/crypto';

/**
 * Passkey unlock with the WebAuthn PRF extension.
 *
 * The passkey never talks to our server. Its PRF output (a secret only that
 * passkey can produce, after a fingerprint or face check) becomes a key that
 * wraps the vault's data key, alongside the PIN. If a browser or passkey
 * provider has no PRF support, the option is simply not offered.
 */

const INFO = 'resolvr-passkey-v1';

interface PrfOutputs {
    prf?: { enabled?: boolean; results?: { first?: BufferSource } };
}

export async function passkeySupported(): Promise<boolean> {
    if (typeof PublicKeyCredential === 'undefined' || !window.isSecureContext) return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

const toBytes = (value: BufferSource) =>
    value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

async function evaluate(credentialId: Uint8Array<ArrayBuffer>, salt: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
    const credential = (await navigator.credentials.get({
        publicKey: {
            challenge: randomBytes(32),
            allowCredentials: [{ type: 'public-key', id: credentialId }],
            userVerification: 'required',
            extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
        },
    })) as PublicKeyCredential | null;
    const first = (credential?.getClientExtensionResults() as PrfOutputs | undefined)?.prf?.results?.first;
    if (!first) throw new Error('This passkey cannot unlock Resolvr');
    return toBytes(first);
}

/** Create a passkey and return its wrapping key plus the public data needed to use it again. */
export async function registerPasskey(): Promise<{ wrappingKey: CryptoKey; data: Record<string, string> }> {
    const salt = randomBytes(32);
    const credential = (await navigator.credentials.create({
        publicKey: {
            rp: { name: 'Resolvr', id: location.hostname },
            user: { id: randomBytes(16), name: 'Resolvr', displayName: 'Resolvr' },
            challenge: randomBytes(32),
            pubKeyCredParams: [
                { type: 'public-key', alg: -7 },
                { type: 'public-key', alg: -257 },
            ],
            authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
            extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
        },
    })) as PublicKeyCredential | null;
    if (!credential) throw new Error('No passkey was created');
    const outputs = credential.getClientExtensionResults() as PrfOutputs;
    if (outputs.prf?.enabled === false) throw new Error('This device’s passkeys cannot unlock Resolvr');
    const id = new Uint8Array(credential.rawId);
    // Some providers only return the PRF result when the passkey is used, not when it is created.
    const secret = outputs.prf?.results?.first ? toBytes(outputs.prf.results.first) : await evaluate(id, salt);
    return {
        wrappingKey: await keyFromSecret(secret as Uint8Array<ArrayBuffer>, INFO),
        data: { credentialId: toBase64(id), salt: toBase64(salt) },
    };
}

/** Ask the passkey for its secret and turn it into the wrapping key. */
export async function passkeyWrappingKey(data: Record<string, string>): Promise<CryptoKey> {
    if (!data.credentialId || !data.salt) throw new Error('This passkey is not set up');
    const secret = await evaluate(fromBase64(data.credentialId), fromBase64(data.salt));
    return keyFromSecret(secret as Uint8Array<ArrayBuffer>, INFO);
}
