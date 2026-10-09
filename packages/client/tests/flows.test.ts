/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { createSeamlessAuthClient } from '../src/client/createSeamlessAuthClient';
import { SeamlessAuthError } from '../src/client/errors';
import {
  beginSignIn,
  completeOAuthCallback,
  detectPasskeySupport,
  enrollPasskey,
  fallbackSignInOptions,
  finishMagicLinkSignIn,
  formatCountdown,
  hasFallbackSignInOption,
  hasNonPasskeyLoginMethod,
  inAppPath,
  isOtpCharacter,
  loadLoginMethods,
  MAGIC_LINK_SUCCESS_MESSAGE,
  OAUTH_PROVIDER_STORAGE_KEY,
  oauthErrorMessage,
  otpCharacters,
  otpResendFailedMessage,
  parseUserAgent,
  passkeyRegistrationErrorMessage,
  registerWithEmail,
  requestOtp,
  safeReturnPath,
  startOAuthSignIn,
  verifyOtp,
  watchMagicLink,
} from '../src/flows';

const ok = <T>(data: T) => ({ data, error: null });
const failed = (status = 400, code?: string) => ({
  data: null,
  error: new SeamlessAuthError('failed', status, code ? { error: code } : undefined),
});

class FakeChannel {
  static instances: FakeChannel[] = [];
  static posted: unknown[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  closed = false;
  constructor(public name: string) {
    FakeChannel.instances.push(this);
  }
  postMessage(data: unknown) {
    FakeChannel.posted.push(data);
  }
  close() {
    this.closed = true;
  }
}

beforeEach(() => {
  FakeChannel.instances = [];
  FakeChannel.posted = [];
  (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = FakeChannel;
  sessionStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('beginSignIn', () => {
  it('reports a failed start', async () => {
    const step = await beginSignIn(
      { login: jest.fn().mockResolvedValue(failed()), handlePasskeyLogin: jest.fn() },
      { identifier: 'a@b.co', passkeySupported: true, configuredMethods: null }
    );
    expect(step).toEqual({
      kind: 'error',
      message: 'Failed to start sign-in. Please try again.',
    });
  });

  it('signs in with a passkey when the device and user can', async () => {
    const handlePasskeyLogin = jest.fn().mockResolvedValue(ok({}));
    const step = await beginSignIn(
      {
        login: jest.fn().mockResolvedValue(ok({ loginMethods: ['passkey'] })),
        handlePasskeyLogin,
      },
      { identifier: 'a@b.co', passkeySupported: true, configuredMethods: null }
    );
    expect(handlePasskeyLogin).toHaveBeenCalled();
    expect(step).toEqual({ kind: 'signed_in' });
  });

  it('falls back when the passkey ceremony fails', async () => {
    const step = await beginSignIn(
      {
        login: jest.fn().mockResolvedValue(ok({})),
        handlePasskeyLogin: jest.fn().mockResolvedValue(failed()),
      },
      { identifier: 'a@b.co', passkeySupported: true, configuredMethods: null }
    );
    expect(step).toEqual({
      kind: 'choose_method',
      loginMethods: ['passkey', 'magic_link'],
      passkeyFailed: true,
    });
  });

  it('uses the configured methods when the login response has none', async () => {
    const handlePasskeyLogin = jest.fn();
    const step = await beginSignIn(
      {
        login: jest.fn().mockResolvedValue(ok({ loginMethods: [] })),
        handlePasskeyLogin,
      },
      { identifier: 'a@b.co', passkeySupported: false, configuredMethods: ['email_otp'] }
    );
    expect(handlePasskeyLogin).not.toHaveBeenCalled();
    expect(step).toEqual({
      kind: 'choose_method',
      loginMethods: ['email_otp'],
      passkeyFailed: false,
    });
  });
});

describe('registerWithEmail', () => {
  it('succeeds only on a Success message', async () => {
    const register = jest.fn().mockResolvedValue(ok({ message: 'Success' }));
    expect(await registerWithEmail({ register }, 'a@b.co')).toEqual({ error: null });
    expect(register).toHaveBeenCalledWith({ email: 'a@b.co' });

    register.mockResolvedValueOnce(ok({ message: 'Other' }));
    expect((await registerWithEmail({ register }, 'a@b.co')).error).toMatch(
      /unexpected error/
    );

    register.mockResolvedValueOnce(failed());
    expect((await registerWithEmail({ register }, 'a@b.co')).error).toBe(
      'Failed to register. Please try again.'
    );
  });
});

describe('enrollPasskey', () => {
  it('enrols with this device as metadata and refreshes the session', async () => {
    const registerPasskey = jest.fn().mockResolvedValue(ok({}));
    const refreshSession = jest.fn().mockResolvedValue(ok({}));

    const result = await enrollPasskey(
      { client: { registerPasskey }, refreshSession },
      'cross-platform'
    );

    expect(result).toEqual({ error: null });
    expect(registerPasskey).toHaveBeenCalledWith({
      metadata: expect.objectContaining({ friendlyName: expect.any(String) }),
      attachment: 'cross-platform',
    });
    expect(refreshSession).toHaveBeenCalled();
  });

  it('turns a failure into a message without refreshing', async () => {
    const refreshSession = jest.fn();
    const result = await enrollPasskey({
      client: { registerPasskey: jest.fn().mockResolvedValue(failed(401)) },
      refreshSession,
    });

    expect(result.error).toMatch(/session expired/);
    expect(refreshSession).not.toHaveBeenCalled();
  });
});

describe('passkeyRegistrationErrorMessage', () => {
  it('names a policy refusal, a lost session, or nothing in particular', () => {
    expect(
      passkeyRegistrationErrorMessage(
        new SeamlessAuthError('x', 403, { error: 'attachment_not_allowed' })
      )
    ).toMatch(/kind of authenticator/);
    expect(passkeyRegistrationErrorMessage(new SeamlessAuthError('x', 401))).toMatch(
      /Sign in again/
    );
    expect(passkeyRegistrationErrorMessage(new Error('x'))).toBe(
      'Error registering passkey.'
    );
  });
});

const otpClient = () => ({
  requestEmailOtp: jest.fn().mockResolvedValue(ok({})),
  requestLoginEmailOtp: jest.fn().mockResolvedValue(ok({})),
  requestPhoneOtp: jest.fn().mockResolvedValue(ok({})),
  requestLoginPhoneOtp: jest.fn().mockResolvedValue(ok({})),
  verifyEmailOtp: jest.fn().mockResolvedValue(ok({})),
  verifyLoginEmailOtp: jest.fn().mockResolvedValue(ok({})),
  verifyPhoneOtp: jest.fn().mockResolvedValue(ok({})),
  verifyLoginPhoneOtp: jest.fn().mockResolvedValue(ok({})),
});

describe('requestOtp', () => {
  it('picks the endpoint for the channel and flow', async () => {
    const client = otpClient();
    await requestOtp(client, 'email', 'login');
    await requestOtp(client, 'email', 'register');
    await requestOtp(client, 'phone', 'login');
    await requestOtp(client, 'phone', 'register');
    expect(client.requestLoginEmailOtp).toHaveBeenCalledTimes(1);
    expect(client.requestEmailOtp).toHaveBeenCalledTimes(1);
    expect(client.requestLoginPhoneOtp).toHaveBeenCalledTimes(1);
    expect(client.requestPhoneOtp).toHaveBeenCalledTimes(1);
    expect(otpResendFailedMessage('phone')).toMatch(/SMS/);
  });
});

describe('verifyOtp', () => {
  const refreshSession = jest.fn().mockResolvedValue(ok({}));

  it('refuses a short code before calling the server', async () => {
    const client = otpClient();
    const result = await verifyOtp(
      { client, refreshSession },
      { channel: 'email', flow: 'login', code: '123' }
    );
    expect(result).toEqual({ next: null, error: 'Please enter a valid code.' });
    expect(client.verifyLoginEmailOtp).not.toHaveBeenCalled();
  });

  it('signs in on a login code', async () => {
    const client = otpClient();
    const result = await verifyOtp(
      { client, refreshSession },
      { channel: 'phone', flow: 'login', code: '123456' }
    );
    expect(client.verifyLoginPhoneOtp).toHaveBeenCalledWith('123456');
    expect(refreshSession).toHaveBeenCalled();
    expect(result).toEqual({ next: 'home', error: null });
  });

  it('reports a rejected code', async () => {
    const client = otpClient();
    client.verifyEmailOtp.mockResolvedValueOnce(failed());
    expect(
      await verifyOtp(
        { client, refreshSession },
        { channel: 'email', flow: 'register', code: '123456' }
      )
    ).toEqual({ next: null, error: 'Verification failed.' });
  });

  it('leads a registration email code to passkey enrolment when supported', async () => {
    const client = otpClient();
    const deps = { client, refreshSession };
    const input = { channel: 'email', flow: 'register', code: '123456' } as const;
    expect(await verifyOtp(deps, { ...input, passkeySupported: true })).toEqual({
      next: 'register_passkey',
      error: null,
    });
    expect(await verifyOtp(deps, { ...input, passkeySupported: false })).toEqual({
      next: 'home',
      error: null,
    });
  });

  it('sends the email code after a registration phone code', async () => {
    const client = otpClient();
    const deps = { client, refreshSession };
    const input = { channel: 'phone', flow: 'register', code: '123456' } as const;
    expect(await verifyOtp(deps, input)).toEqual({ next: 'verify_email', error: null });
    expect(client.requestEmailOtp).toHaveBeenCalled();

    client.requestEmailOtp.mockResolvedValueOnce(failed());
    expect((await verifyOtp(deps, input)).error).toMatch(/Failed to send Email code/);
  });
});

describe('otp helpers', () => {
  it('formats a countdown and filters characters', () => {
    expect(formatCountdown(300)).toBe('05:00');
    expect(formatCountdown(59)).toBe('00:59');
    expect(formatCountdown(-4)).toBe('00:00');
    expect(isOtpCharacter('7', 'numeric')).toBe(true);
    expect(isOtpCharacter('a', 'numeric')).toBe(false);
    expect(isOtpCharacter('a', 'text')).toBe(true);
    expect(otpCharacters('12-3 4a', 'numeric')).toEqual(['1', '2', '3', '4']);
    expect(otpCharacters('ab1C', 'text')).toEqual(['a', 'b', 'C']);
  });
});

describe('magic link', () => {
  it('signs in once when another tab reports the link verified', async () => {
    const checkMagicLink = jest.fn().mockResolvedValue(ok({ message: 'Success' }));
    const refreshSession = jest.fn().mockResolvedValue(ok({}));
    const onSignedIn = jest.fn();

    const stop = watchMagicLink({
      client: { checkMagicLink },
      refreshSession,
      onSignedIn,
    });
    const channel = FakeChannel.instances[0];

    channel.onmessage?.({ data: { type: 'OTHER' } });
    channel.onmessage?.({ data: { type: MAGIC_LINK_SUCCESS_MESSAGE } });
    channel.onmessage?.({ data: { type: MAGIC_LINK_SUCCESS_MESSAGE } });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(onSignedIn).toHaveBeenCalledTimes(1);
    stop();
    expect(channel.closed).toBe(true);
  });

  it('polls until the link is used, treating a pending answer as not done', async () => {
    jest.useFakeTimers();
    const checkMagicLink = jest
      .fn()
      .mockResolvedValueOnce(ok(null))
      .mockResolvedValue(ok({ message: 'Success' }));
    const refreshSession = jest.fn().mockResolvedValue(ok({}));
    const onSignedIn = jest.fn();

    const stop = watchMagicLink({
      client: { checkMagicLink },
      refreshSession,
      onSignedIn,
      pollIntervalMs: 1000,
    });

    await jest.advanceTimersByTimeAsync(1000);
    expect(onSignedIn).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1000);
    expect(onSignedIn).toHaveBeenCalledTimes(1);
    stop();
  });

  it('tells the requesting tab and collects the session in this browser', async () => {
    const checkMagicLink = jest.fn().mockResolvedValue(ok({}));
    const refreshSession = jest
      .fn()
      .mockResolvedValueOnce(failed(401))
      .mockResolvedValueOnce(ok({}));

    expect(
      await finishMagicLinkSignIn({ client: { checkMagicLink }, refreshSession })
    ).toBe('signed-in');
    expect(FakeChannel.posted).toEqual([{ type: MAGIC_LINK_SUCCESS_MESSAGE }]);
    expect(checkMagicLink).toHaveBeenCalledTimes(1);
    expect(refreshSession).toHaveBeenCalledWith({ background: true });
  });

  it('reports a link opened on another device', async () => {
    const refreshSession = jest.fn().mockResolvedValue(failed(401));
    expect(
      await finishMagicLinkSignIn({
        client: { checkMagicLink: jest.fn().mockResolvedValue(ok(null)) },
        refreshSession,
      })
    ).toBe('elsewhere');
  });
});

describe('OAuth', () => {
  const origin = 'https://app.example.com';
  const params = (values: Record<string, string>) => new URLSearchParams(values);

  it('remembers the provider and opens the authorization URL', async () => {
    const open = jest.fn().mockResolvedValue({ type: 'navigated' });
    const startOAuthLogin = jest
      .fn()
      .mockResolvedValue(ok({ authorizationUrl: 'https://idp/authorize' }));

    const result = await startOAuthSignIn(
      {
        actions: { startOAuthLogin, finishOAuthLogin: jest.fn() },
        oauthRedirect: { open },
      },
      { providerId: 'mock', redirectUri: `${origin}/oauth/callback` }
    );

    expect(result).toEqual({ error: null });
    expect(sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY)).toBe('mock');
    expect(open).toHaveBeenCalledWith(
      'https://idp/authorize',
      `${origin}/oauth/callback`
    );
  });

  it('reports a provider that will not start', async () => {
    const result = await startOAuthSignIn(
      {
        actions: {
          startOAuthLogin: jest.fn().mockResolvedValue(failed()),
          finishOAuthLogin: jest.fn(),
        },
        oauthRedirect: { open: jest.fn() },
      },
      { providerId: 'mock', redirectUri: 'x' }
    );
    expect(result.error).toBe('Could not start sign-in with this provider.');
  });

  it('finishes in place when the port hands the callback back', async () => {
    const finishOAuthLogin = jest.fn().mockResolvedValue(failed());
    const result = await startOAuthSignIn(
      {
        actions: {
          startOAuthLogin: jest.fn().mockResolvedValue(ok({ authorizationUrl: 'u' })),
          finishOAuthLogin,
        },
        oauthRedirect: {
          open: jest.fn().mockResolvedValue({ type: 'callback', code: 'c', state: 's' }),
        },
      },
      { providerId: 'mock', redirectUri: 'x' }
    );
    expect(finishOAuthLogin).toHaveBeenCalledWith({
      providerId: 'mock',
      code: 'c',
      state: 's',
    });
    expect(result.error).toBe('Could not finish sign-in with this provider.');
  });

  it('refuses a callback missing its code, state, or provider', async () => {
    const finishOAuthLogin = jest.fn();
    const outcome = await completeOAuthCallback(
      { finishOAuthLogin },
      params({ code: 'c', state: 's' }),
      origin
    );
    expect(outcome.kind).toBe('error');
    expect(finishOAuthLogin).not.toHaveBeenCalled();
  });

  it('finishes a callback and keeps the destination in-app', async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, 'mock');
    const finishOAuthLogin = jest
      .fn()
      .mockResolvedValue(ok({ returnTo: 'https://evil.example/steal' }));

    const outcome = await completeOAuthCallback(
      { finishOAuthLogin },
      params({ code: 'c', state: 's' }),
      origin
    );

    expect(outcome).toEqual({ kind: 'done', destination: '/' });
    expect(sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY)).toBeNull();
  });

  it('asks for passkey enrolment when the API does', async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, 'mock');
    const outcome = await completeOAuthCallback(
      {
        finishOAuthLogin: jest
          .fn()
          .mockResolvedValue(
            ok({ returnTo: `${origin}/settings?tab=1`, nextStep: 'enroll_passkey' })
          ),
      },
      params({ code: 'c', state: 's' }),
      origin
    );
    expect(outcome).toEqual({ kind: 'enroll_passkey', returnTo: '/settings?tab=1' });
  });

  it('maps a provider failure to its message', async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, 'mock');
    const outcome = await completeOAuthCallback(
      {
        finishOAuthLogin: jest.fn().mockResolvedValue(failed(400, 'oauth_missing_email')),
      },
      params({ code: 'c', state: 's' }),
      origin
    );
    expect(outcome).toEqual({
      kind: 'error',
      message: oauthErrorMessage(
        new SeamlessAuthError('x', 400, { error: 'oauth_missing_email' })
      ),
    });
    expect(oauthErrorMessage(new Error('x'))).toMatch(/could not complete sign-in/);
  });
});

describe('redirects', () => {
  it('honours only in-app paths', () => {
    expect(safeReturnPath('/settings')).toBe('/settings');
    expect(safeReturnPath('//evil.example')).toBe('/');
    expect(safeReturnPath('/\\evil.example')).toBe('/');
    expect(safeReturnPath('https://evil.example')).toBe('/');
    expect(safeReturnPath(42)).toBe('/');
    expect(inAppPath(undefined, 'https://a.example')).toBeNull();
    expect(inAppPath('https://b.example/x', 'https://a.example')).toBeNull();
    expect(inAppPath('/x#y', 'https://a.example')).toBe('/x#y');
    // Same-origin URLs whose path a browser reads as protocol-relative.
    for (const url of [
      'https://a.example//evil.example',
      'https://a.example/\\evil.example',
      'https://a.example/\t/evil.example',
    ]) {
      expect(inAppPath(url, 'https://a.example')).toBeNull();
    }
    expect(safeReturnPath('/\t/evil.example')).toBe('/');
    expect(safeReturnPath('/a\nb')).toBe('/');
  });
});

describe('login methods', () => {
  it('loads the instance methods and treats a failure as unknown', async () => {
    expect(
      await loadLoginMethods({
        getPublicSystemConfig: jest
          .fn()
          .mockResolvedValue(ok({ loginMethods: ['passkey'] })),
      })
    ).toEqual(['passkey']);
    expect(
      await loadLoginMethods({
        getPublicSystemConfig: jest.fn().mockResolvedValue(failed()),
      })
    ).toBeNull();
    expect(
      await loadLoginMethods({
        getPublicSystemConfig: jest.fn().mockRejectedValue(new Error('x')),
      })
    ).toBeNull();
    expect(hasNonPasskeyLoginMethod(null)).toBe(false);
    expect(hasNonPasskeyLoginMethod(['passkey', 'email_otp'])).toBe(true);
  });

  it('offers fallbacks that fit the identifier', () => {
    const email = fallbackSignInOptions('a@b.co', ['magic_link', 'email_otp'], {
      emailOtp: true,
      passkeyRetry: true,
    });
    expect(email).toEqual({
      magicLink: true,
      emailOtp: true,
      phoneOtp: false,
      passkeyRetry: false,
    });

    const phone = fallbackSignInOptions('+14155552671', null, {
      emailOtp: true,
      passkeyRetry: false,
    });
    expect(phone.phoneOtp).toBe(true);
    expect(phone.magicLink).toBe(false);
    expect(
      hasFallbackSignInOption(
        fallbackSignInOptions('nope', [], { emailOtp: true, passkeyRetry: true })
      )
    ).toBe(false);
  });
});

describe('detectPasskeySupport', () => {
  const port = (supported: boolean, platform: Promise<boolean>) => ({
    isSupported: () => supported,
    isPlatformAuthenticatorAvailable: () => platform,
    create: jest.fn(),
    get: jest.fn(),
  });

  it('needs WebAuthn and a platform authenticator, and never rejects', async () => {
    expect(await detectPasskeySupport(port(true, Promise.resolve(true)))).toBe(true);
    expect(await detectPasskeySupport(port(false, Promise.resolve(true)))).toBe(false);
    expect(await detectPasskeySupport(port(true, Promise.reject(new Error('x'))))).toBe(
      false
    );
  });
});

describe('parseUserAgent', () => {
  it('names the platform and browser', () => {
    jest
      .spyOn(window.navigator, 'userAgent', 'get')
      .mockReturnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0'
      );
    expect(parseUserAgent()).toEqual({
      platform: 'windows',
      browser: 'edge',
      deviceInfo: 'windows • edge',
    });
  });
});

// The adapters answer 415 to a body that is not JSON, because a cross-site form
// can post a text/plain body shaped like JSON with no CORS preflight.
describe('request bodies', () => {
  it('sends every body to /auth as application/json', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchMock = jest.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ message: 'Success' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
      transport: { fetch: fetchMock as unknown as typeof fetch },
    });

    await client.login({ identifier: 'a@b.co', passkeyAvailable: false });
    await client.register({ email: 'a@b.co' });
    await client.requestEmailOtp();
    await client.verifyEmailOtp('123456');
    await client.requestLoginEmailOtp();
    await client.verifyLoginEmailOtp('123456');
    await client.requestPhoneOtp();
    await client.verifyPhoneOtp('123456');
    await client.requestLoginPhoneOtp();
    await client.verifyLoginPhoneOtp('123456');
    await client.requestMagicLink();
    await client.startOAuthLogin({ providerId: 'mock', redirectUri: 'https://a/cb' });
    await client.finishOAuthLogin({ providerId: 'mock', code: 'c', state: 's' });
    await client.updateCredential({ id: 'c1', friendlyName: null });
    await client.verifyTotpEnrollment('123456');
    await client.getCurrentUser();
    await client.checkMagicLink();

    const withBody = calls.filter(call => call.init.body != null);
    expect(withBody.length).toBeGreaterThan(10);

    for (const { url, init } of calls) {
      const headers = new Headers(init.headers);
      expect(init.credentials).toBe('include');
      if (init.body != null) {
        expect([url, headers.get('content-type')]).toEqual([url, 'application/json']);
        expect(() => JSON.parse(String(init.body))).not.toThrow();
      } else {
        expect(headers.has('content-type')).toBe(false);
      }
    }
  });
});

describe('authorizedFetch in a page', () => {
  it('judges a relative URL by the page origin, as fetch resolves it', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }) as Response);
    const sameOrigin = createSeamlessAuthClient({
      apiHost: window.location.origin,
      transport: { fetch: fetchImpl as unknown as typeof fetch },
    });
    const elsewhere = createSeamlessAuthClient({
      apiHost: 'https://auth.example.com',
      transport: { fetch: fetchImpl as unknown as typeof fetch },
    });

    await sameOrigin.authorizedFetch('api/me');
    expect(fetchImpl).toHaveBeenCalledWith('api/me', expect.anything());
    await expect(elsewhere.authorizedFetch('api/me')).rejects.toThrow(/trustedOrigins/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
