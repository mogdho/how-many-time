import { test, expect, afterEach } from 'vitest';
import { toBase64Url, fromBase64Url, isBiometricAvailable, registerBiometric, verifyBiometric } from './biometric';

// navigator.credentials is the browser's WebAuthn API; there is no real one in Node, so tests stub it.
const original = { credentials: globalThis.navigator?.credentials, pkc: globalThis.PublicKeyCredential };
const stubCredentials = (impl) => {
    Object.defineProperty(globalThis.navigator, 'credentials', { value: impl, configurable: true });
};
afterEach(() => {
    Object.defineProperty(globalThis.navigator, 'credentials', { value: original.credentials, configurable: true });
    globalThis.PublicKeyCredential = original.pkc;
});

test('base64url round trip', () => {
    const bytes = new Uint8Array([0, 251, 255, 62, 63]);
    expect(Array.from(fromBase64Url(toBase64Url(bytes.buffer)))).toEqual(Array.from(bytes));
    expect(toBase64Url(bytes.buffer)).not.toMatch(/[+/=]/);
});

test('unavailable without PublicKeyCredential', async () => {
    globalThis.PublicKeyCredential = undefined;
    expect(await isBiometricAvailable()).toBe(false);
});

test('available when the platform authenticator is', async () => {
    globalThis.PublicKeyCredential = { isUserVerifyingPlatformAuthenticatorAvailable: async () => true };
    expect(await isBiometricAvailable()).toBe(true);
});

test('register returns id and asks for platform + user verification', async () => {
    let opts;
    stubCredentials({ create: async (o) => { opts = o; return { rawId: new Uint8Array([1, 2, 3]).buffer }; } });
    expect(await registerBiometric('Sandip')).toBe(toBase64Url(new Uint8Array([1, 2, 3]).buffer));
    expect(opts.publicKey.authenticatorSelection).toMatchObject({ authenticatorAttachment: 'platform', userVerification: 'required' });
});

test('register cancelled → null', async () => {
    stubCredentials({ create: async () => { throw new DOMException('x', 'NotAllowedError'); } });
    expect(await registerBiometric('a')).toBeNull();
});

test('verify true on success, false on any error', async () => {
    let opts;
    stubCredentials({ get: async (o) => { opts = o; return { id: 'x' }; } });
    expect(await verifyBiometric('AQID')).toBe(true);
    expect(Array.from(opts.publicKey.allowCredentials[0].id)).toEqual([1, 2, 3]);
    expect(opts.publicKey.userVerification).toBe('required');
    stubCredentials({ get: async () => { throw new DOMException('x', 'NotAllowedError'); } });
    expect(await verifyBiometric('AQID')).toBe(false);
});

test('verify false when the API is missing', async () => {
    stubCredentials(undefined);
    expect(await verifyBiometric('AQID')).toBe(false);
});
