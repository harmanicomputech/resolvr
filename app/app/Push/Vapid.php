<?php

namespace App\Push;

use OpenSSLAsymmetricKey;
use RuntimeException;

/**
 * VAPID (RFC 8292): signs a short-lived ES256 token that tells a browser's
 * push service these pushes come from us. Reminders carry no payload, so no
 * message encryption (RFC 8291) is needed: just this signature.
 */
class Vapid
{
    public function __construct(
        private readonly string $publicKey,
        private readonly string $privateKeyPem,
        private readonly string $subject,
    ) {}

    public static function fromConfig(): ?self
    {
        $c = config('services.webpush');
        if (! $c['public_key'] || ! $c['private_key']) {
            return null;
        }

        return new self($c['public_key'], base64_decode($c['private_key']), $c['subject']);
    }

    /** @return array{public: string, private: string} base64url public point and base64 PEM private key */
    public static function generate(): array
    {
        $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        if (! $key instanceof OpenSSLAsymmetricKey) {
            throw new RuntimeException('OpenSSL could not create a P-256 key.');
        }
        $details = openssl_pkey_get_details($key);
        if (! openssl_pkey_export($key, $pem) || $details === false) {
            throw new RuntimeException('OpenSSL could not export the key.');
        }
        $ec = $details['ec'];

        return [
            'public' => self::b64url("\x04".str_pad($ec['x'], 32, "\0", STR_PAD_LEFT).str_pad($ec['y'], 32, "\0", STR_PAD_LEFT)),
            'private' => base64_encode($pem),
        ];
    }

    public function publicKey(): string
    {
        return $this->publicKey;
    }

    /** The Authorization header value for a push to `$endpoint`. */
    public function authorization(string $endpoint, int $ttlSeconds = 43200): string
    {
        $url = parse_url($endpoint);
        if (! is_array($url) || ! isset($url['scheme'], $url['host'])) {
            throw new RuntimeException('Not a push endpoint URL.');
        }
        $audience = $url['scheme'].'://'.$url['host'].(isset($url['port']) ? ':'.$url['port'] : '');
        $input = self::b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']))
            .'.'.self::b64url(json_encode(['aud' => $audience, 'exp' => time() + $ttlSeconds, 'sub' => $this->subject]));
        $key = openssl_pkey_get_private($this->privateKeyPem);
        if (! $key || ! openssl_sign($input, $der, $key, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('VAPID signing failed; check VAPID_PRIVATE_KEY.');
        }

        return 'vapid t='.$input.'.'.self::b64url(self::derToJose($der)).', k='.$this->publicKey;
    }

    /** OpenSSL gives an ASN.1 DER signature; JWT wants the raw 64-byte r||s. */
    public static function derToJose(string $der): string
    {
        $offset = 2 + (ord($der[1]) & 0x80 ? ord($der[1]) & 0x7F : 0); // SEQUENCE header
        $parts = '';
        for ($i = 0; $i < 2; $i++) {
            $length = ord($der[$offset + 1]);
            $int = substr($der, $offset + 2, $length);
            $parts .= str_pad(ltrim($int, "\0"), 32, "\0", STR_PAD_LEFT);
            $offset += 2 + $length;
        }

        return $parts;
    }

    public static function b64url(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }
}
