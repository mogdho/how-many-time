// Fingerprint / face unlock through the phone's built-in authenticator (WebAuthn).
// With no server the result can't be checked cryptographically, so this is a screen lock
// of the same strength as the PIN. It does not encrypt anything.

export const toBase64Url = (buffer) => {
    let binary = '';
    for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const fromBase64Url = (text) => {
    const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

export const isBiometricAvailable = async () => {
    try {
        return Boolean(await globalThis.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.());
    } catch {
        return false;
    }
};

// Asks for the fingerprint once and returns the new credential id, or null if cancelled or unsupported.
export const registerBiometric = async (username) => {
    try {
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: randomBytes(32),
                rp: { name: 'HMT' },
                user: { id: randomBytes(16), name: username || 'HMT user', displayName: username || 'HMT user' },
                pubKeyCredParams: [
                    { type: 'public-key', alg: -7 },
                    { type: 'public-key', alg: -257 },
                ],
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    userVerification: 'required',
                    residentKey: 'discouraged',
                },
                timeout: 60000,
            },
        });
        return credential ? toBase64Url(credential.rawId) : null;
    } catch {
        return null;
    }
};

// True only if the phone confirmed the fingerprint for this credential. Never throws.
export const verifyBiometric = async (credentialId) => {
    try {
        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge: randomBytes(32),
                // 'internal' = this phone only, so Chrome doesn't offer another device if the passkey was removed.
                allowCredentials: [{ type: 'public-key', id: fromBase64Url(credentialId), transports: ['internal'] }],
                userVerification: 'required',
                timeout: 60000,
            },
        });
        return Boolean(assertion);
    } catch {
        return false;
    }
};
