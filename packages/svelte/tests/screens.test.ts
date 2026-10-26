/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  MAGIC_LINK_SUCCESS_MESSAGE,
  OAUTH_PROVIDER_STORAGE_KEY,
  type OAuthRedirectPort,
} from '@seamless-auth/client';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSeamlessAuth } from '../src';
import type { AuthScreen } from '../src/navigation';
import {
  confirmationRequired,
  createAdapter,
  passkeyPort,
  signedIn,
  signedOut,
  type AdapterHandler,
  type AdapterReply,
} from '../../../test-support/fakeAdapter';
import { createFakeNavigator } from './fakeNavigator.svelte';
import Harness from './Harness.svelte';

const ok = { body: { message: 'Success' } };

let nav: ReturnType<typeof createFakeNavigator>['nav'];

async function open(
  start: AuthScreen | 'settings',
  routes: Record<string, AdapterReply | AdapterHandler>,
  options: {
    passkeys?: boolean;
    state?: Record<string, string>;
    query?: string;
    oauthRedirect?: OAuthRedirectPort;
    config?: Record<string, unknown>;
  } = {}
) {
  const adapter = createAdapter({ 'GET /users/me': signedOut, ...routes });
  const passkeys = passkeyPort(options.passkeys ?? false);
  const auth = createSeamlessAuth({
    apiHost: 'https://app.example.com',
    fetch: adapter.fetch,
    ports: {
      passkeys,
      ...(options.oauthRedirect ? { oauthRedirect: options.oauthRedirect } : {}),
    },
    ...options.config,
  });

  const fake = createFakeNavigator({ screen: start, query: options.query });
  fake.nav.state = options.state ?? {};
  nav = fake.nav;

  render(Harness, { props: { auth, navigator: fake.navigator, nav: fake.nav } });
  await settle();
  return { adapter, passkeys, auth };
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0)).then(() => undefined);

async function waitSettled() {
  for (let i = 0; i < 6; i++) await settle();
}

const text = () => document.body.textContent ?? '';
const heading = () => document.querySelector('h1, h2')?.textContent?.trim();

function button(name: string | RegExp) {
  return screen.getByRole('button', { name });
}

async function click(name: string | RegExp) {
  await fireEvent.click(button(name));
  await waitSettled();
}

async function submit() {
  await fireEvent.submit(document.querySelector('form')!);
  await waitSettled();
}

async function type(selector: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(selector)!;
  await fireEvent.input(input, { target: { value } });
  await fireEvent.blur(input);
}

async function typeCode(code: string) {
  const boxes = screen.getAllByLabelText(/^Digit \d$/);
  expect(boxes).toHaveLength(code.length);
  for (const [i, char] of code.split('').entries()) {
    await fireEvent.input(boxes[i], { target: { value: char } });
  }
}

function bodyOf(adapter: ReturnType<typeof createAdapter>, method: string, path: string) {
  const [call] = adapter.called(method, path);
  expect(new Headers(call.init.headers).get('content-type')).toBe('application/json');
  return JSON.parse(String(call.init.body));
}

class FakeChannel {
  static instances: FakeChannel[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  constructor() {
    FakeChannel.instances.push(this);
  }
  postMessage() {}
  close() {}
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.getElementById('seamless-auth-styles')?.remove();
  FakeChannel.instances = [];
  (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = FakeChannel;
});

afterEach(() => cleanup());

describe('login screen', () => {
  it('opens on Create Account and starts registration with an email', async () => {
    const { adapter } = await open('login', { 'POST /registration/register': ok });

    expect(heading()).toBe('Create Account');
    expect(button('Register')).toBeDisabled();
    expect(text()).toContain('Enter your email address to continue.');
    expect(document.getElementById('seamless-auth-styles')).not.toBeNull();

    await type('#email', 'not-an-email');
    expect(text()).toContain('Please enter a valid email');

    await type('#email', 'ada@example.com');
    expect(button('Register')).not.toBeDisabled();
    await submit();

    expect(bodyOf(adapter, 'POST', '/registration/register')).toEqual({
      email: 'ada@example.com',
    });
    expect(nav.current).toBe('verifyEmailOtp');
    expect(heading()).toBe('Verify Your Email');
  });

  it('reports a failed registration', async () => {
    await open('login', { 'POST /registration/register': { status: 500 } });
    await type('#email', 'ada@example.com');
    await submit();
    expect(text()).toContain('Failed to register. Please try again.');
    expect(nav.current).toBe('login');
  });

  it('opens on Sign In for a browser that signed in before, and offers fallbacks', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    const { adapter } = await open('login', {
      'POST /login': { body: { loginMethods: ['magic_link', 'email_otp'] } },
      'POST /otp/generate-login-email-otp': ok,
    });

    expect(heading()).toBe('Sign In');
    await type('#identifier', 'ada@example.com');
    await submit();

    expect(bodyOf(adapter, 'POST', '/login')).toEqual({
      identifier: 'ada@example.com',
      passkeyAvailable: false,
    });
    expect(text()).toContain('Email Magic Link');
    expect(text()).not.toContain('Text Message Code');

    await click(/Email Code/);
    expect(nav.current).toBe('verifyEmailOtp');
    expect(nav.state).toEqual({ flow: 'login' });
  });

  it('runs the passkey ceremony straight away when it can', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    let session = signedOut;
    const { adapter, passkeys } = await open(
      'login',
      {
        'GET /users/me': () => session,
        'POST /login': { body: { loginMethods: ['passkey'] } },
        'POST /webAuthn/login/start': { body: { challenge: 'abc' } },
        'POST /webAuthn/login/finish': () => {
          session = signedIn;
          return ok;
        },
      },
      { passkeys: true }
    );
    passkeys.get.mockResolvedValue({
      id: 'cred',
      response: {},
      clientExtensionResults: {},
    });

    await type('#identifier', 'ada@example.com');
    await submit();

    expect(passkeys.get).toHaveBeenCalled();
    expect(adapter.called('POST', '/webAuthn/login/finish')).toHaveLength(1);
    expect(nav.current).toBe('app');
  });

  it('falls back when the passkey ceremony fails, and can retry it', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    const { passkeys } = await open(
      'login',
      {
        'POST /login': { body: { loginMethods: ['passkey', 'magic_link'] } },
        'POST /webAuthn/login/start': { body: { challenge: 'abc' } },
      },
      { passkeys: true }
    );
    passkeys.get.mockRejectedValue(
      Object.assign(new Error('x'), { name: 'NotAllowedError' })
    );

    await type('#identifier', 'ada@example.com');
    await submit();

    expect(text()).toContain('Passkey sign-in could not be completed');
    await click('Try passkey anyway');
    expect(passkeys.get).toHaveBeenCalledTimes(2);
  });

  it('switches between the two forms', async () => {
    await open('login', {});
    await click(/Already have an account/);
    expect(heading()).toBe('Sign In');
    await type('#identifier', 'nonsense');
    expect(text()).toContain('Please enter a valid email or phone number');
    await click(/Create one/);
    expect(heading()).toBe('Create Account');
  });
});

describe('magic link screens', () => {
  it('sends a link from the login screen and waits for it', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    let used = false;
    await open('login', {
      'GET /users/me': () => (used ? signedIn : signedOut),
      'POST /login': { body: { loginMethods: ['magic_link'] } },
      'POST /magic-link': ok,
      'GET /magic-link/check': () => (used ? ok : { status: 204 }),
    });

    await type('#identifier', 'ada@example.com');
    await submit();
    await click(/Email Magic Link/);

    expect(nav.current).toBe('magicLinkSent');
    expect(heading()).toBe('Check your email');
    expect(text()).toContain('ada@example.com');
    expect(button('Resend link')).toBeDisabled();

    used = true;
    FakeChannel.instances
      .at(-1)
      ?.onmessage?.({ data: { type: MAGIC_LINK_SUCCESS_MESSAGE } });
    await waitSettled();

    expect(nav.current).toBe('app');
  });

  it('verifies a link exactly once, drops the token, and signs this tab in', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { adapter } = await open(
        'verifyMagicLink',
        { 'GET /users/me': signedIn, 'GET /magic-link/verify/t-once': ok },
        { query: 'token=t-once' }
      );
      await waitSettled();

      expect(adapter.called('GET', '/magic-link/verify/t-once')).toHaveLength(1);
      expect(text()).toContain('Login verified. Redirecting...');
      expect(nav.query.has('token')).toBe(false);

      await vi.advanceTimersByTimeAsync(950);
      expect(nav.current).toBe('app');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not send a link twice when the screen mounts again', async () => {
    const routes = { 'GET /users/me': signedIn, 'GET /magic-link/verify/t-twice': ok };
    const { adapter } = await open('verifyMagicLink', routes, { query: 'token=t-twice' });
    await waitSettled();
    cleanup();

    const again = await open('verifyMagicLink', routes, { query: 'token=t-twice' });
    await waitSettled();

    expect(adapter.called('GET', '/magic-link/verify/t-twice')).toHaveLength(1);
    expect(again.adapter.called('GET', '/magic-link/verify/t-twice')).toHaveLength(0);
    expect(text()).toContain('This sign-in link has already been used.');
  });

  it('asks before signing in the device a link opened elsewhere came from', async () => {
    const { adapter } = await open(
      'verifyMagicLink',
      {
        'GET /magic-link/verify/t-held': confirmationRequired,
        'POST /magic-link/verify/t-held/confirm': ok,
      },
      { query: 'token=t-held' }
    );
    await waitSettled();

    expect(heading()).toBe('Confirm this sign-in');
    expect(text()).toContain('A sign-in was requested from an Android device on ');
    expect(text()).not.toContain('Failed to verify token');
    expect(adapter.called('GET', '/magic-link/check')).toHaveLength(0);

    await click('Yes, sign in that device');
    await waitSettled();

    expect(adapter.called('POST', '/magic-link/verify/t-held/confirm')).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toContain(
      'You can return to your other device'
    );
    expect(nav.current).toBe('verifyMagicLink');
  });

  it('reports a confirmation the server refuses, and changes nothing on decline', async () => {
    const { adapter } = await open(
      'verifyMagicLink',
      {
        'GET /magic-link/verify/t-refused': confirmationRequired,
        'POST /magic-link/verify/t-refused/confirm': {
          status: 400,
          body: { error: 'Invalid' },
        },
      },
      { query: 'token=t-refused' }
    );
    await waitSettled();

    await click('Yes, sign in that device');
    await waitSettled();

    expect(screen.getByRole('alert').textContent).toContain(
      'We could not confirm this sign-in'
    );
    expect(button('Yes, sign in that device')).not.toBeDisabled();

    await click("No, this wasn't me");

    expect(text()).toContain('You can ignore the email');
    expect(adapter.called('POST', '/magic-link/verify/t-refused/confirm')).toHaveLength(
      1
    );
  });

  it('says to go back when the link was opened elsewhere, and reports failures', async () => {
    await open(
      'verifyMagicLink',
      {
        'GET /magic-link/verify/t-elsewhere': ok,
        'GET /magic-link/check': { status: 204 },
      },
      { query: 'token=t-elsewhere' }
    );
    await waitSettled();
    expect(text()).toContain('Return to the device where you requested this link');
    cleanup();

    await open(
      'verifyMagicLink',
      { 'GET /magic-link/verify/t1': { status: 400 } },
      {
        query: 'token=t1',
      }
    );
    await waitSettled();
    expect(text()).toContain('Failed to verify token');
    cleanup();

    await open('verifyMagicLink', {});
    expect(text()).toContain('Missing token for verification.');
  });
});

describe('one-time code screen', () => {
  it('signs in with an email code', async () => {
    let session = signedOut;
    const { adapter } = await open(
      'verifyEmailOtp',
      {
        'GET /users/me': () => session,
        'POST /otp/verify-login-email-otp': () => {
          session = signedIn;
          return ok;
        },
      },
      { state: { flow: 'login' } }
    );

    expect(heading()).toBe('Verify Your Email');
    expect(text()).toContain('05:00');

    await submit();
    expect(text()).toContain('Please enter a valid code.');

    await typeCode('abcdef');
    await submit();

    expect(bodyOf(adapter, 'POST', '/otp/verify-login-email-otp')).toEqual({
      verificationToken: 'abcdef',
    });
    expect(nav.current).toBe('app');
  });

  it('leads a registration to passkey enrolment when the device supports it', async () => {
    await open(
      'verifyEmailOtp',
      {
        'POST /otp/verify-email-otp': ok,
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
      },
      { passkeys: true }
    );

    await typeCode('abcdef');
    await submit();

    expect(nav.current).toBe('registerPasskey');
    expect(heading()).toBe('Secure Your Account with a Passkey');
  });

  it('reports a rejected code, resends one, and moves on to the email code', async () => {
    let accept = false;
    const { adapter } = await open('verifyPhoneOtp', {
      'POST /otp/verify-phone-otp': () => (accept ? ok : { status: 400 }),
      'POST /otp/generate-phone-otp': ok,
      'POST /otp/generate-email-otp': ok,
    });

    expect(heading()).toBe('Verify Your Phone Number');
    await typeCode('123456');
    await submit();
    expect(text()).toContain('Verification failed.');

    await click('Resend code to phone');
    expect(adapter.called('POST', '/otp/generate-phone-otp')).toHaveLength(1);
    expect(text()).toContain('Verification SMS has been resent.');

    accept = true;
    await submit();
    expect(adapter.called('POST', '/otp/generate-email-otp')).toHaveLength(1);
    expect(nav.current).toBe('verifyEmailOtp');
  });

  it('reports a failed resend and goes back to login', async () => {
    await open('verifyEmailOtp', { 'POST /otp/generate-email-otp': { status: 500 } });
    await click('Resend code to email');
    expect(text()).toContain('Failed to send Email code.');
    await click('Back to login');
    expect(nav.current).toBe('login');
  });
});

describe('OAuth', () => {
  it('lists providers and starts a sign-in with the callback screen as redirect URI', async () => {
    const oauthRedirect = { open: vi.fn().mockResolvedValue({ type: 'navigated' }) };
    const { adapter } = await open(
      'login',
      {
        'GET /oauth/providers': {
          body: { providers: [{ id: 'mock', name: 'Mock OIDC' }] },
        },
        'POST /oauth/mock/start': {
          body: { authorizationUrl: 'https://idp.test/authorize' },
        },
      },
      { oauthRedirect }
    );
    await waitSettled();

    await click('Continue with Mock OIDC');

    expect(bodyOf(adapter, 'POST', '/oauth/mock/start')).toMatchObject({
      redirectUri: 'http://localhost/auth/oauthCallback',
    });
    expect(sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY)).toBe('mock');
    expect(oauthRedirect.open).toHaveBeenCalledWith(
      'https://idp.test/authorize',
      'http://localhost/auth/oauthCallback'
    );
  });

  it('reports a provider that will not start', async () => {
    await open('login', {
      'GET /oauth/providers': {
        body: { providers: [{ id: 'mock', name: 'Mock OIDC' }] },
      },
      'POST /oauth/mock/start': { status: 500 },
    });
    await waitSettled();
    await click('Continue with Mock OIDC');
    expect(text()).toContain('Could not start sign-in with this provider.');
  });

  it('finishes on the callback screen, keeps the destination in-app, and drops the code', async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, 'mock');
    const { adapter } = await open(
      'oauthCallback',
      { 'POST /oauth/mock/callback': { body: { returnTo: 'https://evil.test/' } } },
      { query: 'code=c-done&state=s1' }
    );
    await waitSettled();

    expect(bodyOf(adapter, 'POST', '/oauth/mock/callback')).toMatchObject({
      code: 'c-done',
      state: 's1',
    });
    expect(nav.query.has('code')).toBe(false);
    expect(nav.current).toBe('app');
    expect(nav.path).toBe('/');
  });

  it('hands over to passkey enrolment when the API asks for it', async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, 'mock');
    await open(
      'oauthCallback',
      { 'POST /oauth/mock/callback': { body: { nextStep: 'enroll_passkey' } } },
      { query: 'code=c-enroll&state=s1' }
    );
    await waitSettled();
    expect(nav.current).toBe('registerPasskey');
    expect(nav.state).toEqual({ returnTo: '/' });
  });

  it('explains a failed callback', async () => {
    await open('oauthCallback', {}, { query: 'code=c-partial' });
    await waitSettled();
    expect(heading()).toBe('Sign-in failed');
    expect(text()).toContain('missing required information');
    await click('Back to login');
    expect(nav.current).toBe('login');
  });
});

describe('passkey screens', () => {
  it('enrols a passkey and continues to the app', async () => {
    const { adapter, passkeys } = await open(
      'registerPasskey',
      {
        'GET /system-config/public': { body: { loginMethods: ['passkey'] } },
        'GET /webAuthn/register/start': { body: { challenge: 'abc' } },
        'POST /webAuthn/register/finish': ok,
      },
      { passkeys: true }
    );
    passkeys.create.mockResolvedValue({
      id: 'cred',
      response: {},
      clientExtensionResults: {},
    });
    await waitSettled();

    expect(text()).not.toContain('Skip for now');
    await click('Register Passkey');

    expect(bodyOf(adapter, 'POST', '/webAuthn/register/finish').metadata).toMatchObject({
      friendlyName: expect.any(String),
    });
    expect(nav.current).toBe('app');
  });

  it('names a policy refusal, and lets the user skip', async () => {
    const { passkeys } = await open(
      'registerPasskey',
      {
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
        'GET /webAuthn/register/start': {
          status: 403,
          body: { error: 'attachment_not_allowed' },
        },
      },
      { passkeys: true }
    );
    await waitSettled();

    await click('Use a security key instead');
    expect(text()).toContain('does not accept that kind of authenticator');
    expect(passkeys.create).not.toHaveBeenCalled();

    await click('Skip for now');
    // No destination was handed over, so the navigator's own signedInPath
    // applies (see the Kit navigator's tests).
    expect(nav.current).toBe('app');
    expect(nav.path).toBe('/');
  });

  it('lets a user continue when the device cannot, and never strands them', async () => {
    await open('registerPasskey', {
      'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
    });
    await waitSettled();
    expect(heading()).toBe('Passkeys are not available here');
    await click('Continue');
    expect(nav.current).toBe('app');
    cleanup();

    await open('registerPasskey', {
      'GET /system-config/public': { body: { loginMethods: ['passkey'] } },
    });
    await waitSettled();
    expect(text()).toContain('requires one to sign in');
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });

  it('signs in with a passkey alone', async () => {
    const { passkeys } = await open('passkeyLogin', {
      'POST /webAuthn/login/start': { status: 500 },
    });
    expect(heading()).toBe('Login with Passkey');
    await click('Use Passkey');
    expect(text()).toContain('Passkey sign-in could not be completed');
    expect(passkeys.get).not.toHaveBeenCalled();
  });
});

const enrollment = {
  body: {
    message: 'Success',
    secret: 'JBSWY3DPEHPK3PXPJBSWY3DP',
    otpauthUrl:
      'otpauth://totp/Example:ada%40example.com?secret=JBSWY3DPEHPK3PXPJBSWY3DP',
    issuer: 'Example',
    accountName: 'ada@example.com',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  },
};
const totpRefused = { status: 401, body: { error: 'totp_verification_failed' } };

describe('authenticator app sign-in', () => {
  it('is offered with the other ways in, even though /login never lists it', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    await open('login', {
      'POST /login': { body: { loginMethods: ['passkey'] } },
      'GET /system-config/public': { body: { loginMethods: ['passkey'] } },
    });

    await type('#identifier', 'ada@example.com');
    await submit();

    expect(text()).toContain('Choose a sign-in method');
    expect(text()).not.toContain('Email Magic Link');
    await click(/Use an authenticator app/);
    expect(nav.current).toBe('authenticatorCode');
    expect(heading()).toBe('Enter your authenticator code');
  });

  it('signs in with a code', async () => {
    let session = signedOut;
    const { adapter } = await open('authenticatorCode', {
      'GET /users/me': () => session,
      'POST /totp/verify-login': () => {
        session = signedIn;
        return ok;
      },
    });

    await typeCode('123456');
    await submit();

    expect(bodyOf(adapter, 'POST', '/totp/verify-login')).toEqual({ code: '123456' });
    expect(nav.current).toBe('app');
  });

  it('asks for a whole code before sending one', async () => {
    const { adapter } = await open('authenticatorCode', {});
    await submit();
    expect(screen.getByRole('alert').textContent).toContain('Enter the 6-digit code');
    expect(adapter.called('POST', '/totp/verify-login')).toHaveLength(0);
  });

  it('explains a wrong or reused code, a lockout and a rate limit', async () => {
    let reply: AdapterReply = totpRefused;
    await open('authenticatorCode', { 'POST /totp/verify-login': () => reply });

    await typeCode('123456');
    await submit();
    expect(screen.getByRole('alert').textContent).toContain('Each code works once.');
    expect(nav.current).toBe('authenticatorCode');

    reply = { status: 423, body: { error: 'account_locked', retryAfterSeconds: 120 } };
    await typeCode('234567');
    await submit();
    expect(screen.getByRole('alert').textContent).toContain('Try again in 2 minutes.');

    reply = { status: 429, body: { error: 'too_many_requests' } };
    await typeCode('345678');
    await submit();
    expect(screen.getByRole('alert').textContent).toContain('Too many attempts.');

    await click('Back to login');
    expect(nav.current).toBe('login');
  });
});

describe('authenticator app enrollment', () => {
  let clipboard: { writeText: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: clipboard,
      configurable: true,
    });
  });

  it('shows a QR code and setup key, verifies the first code, and continues', async () => {
    const { adapter } = await open(
      'registerAuthenticator',
      { 'POST /totp/enroll/start': enrollment, 'POST /totp/enroll/verify': ok },
      { state: { returnTo: '/settings' } }
    );
    await waitSettled();

    expect(heading()).toBe('Set up an authenticator app');
    const qr = screen.getByRole('img', { name: 'QR code for your authenticator app' });
    expect(qr.querySelector('rect')?.getAttribute('fill')).toBe('#ffffff');
    expect(qr.querySelector('path')?.getAttribute('d')).toMatch(/^M/);
    expect(text()).toContain('JBSW Y3DP EHPK 3PXP JBSW Y3DP');
    expect(
      screen.getByRole('link', { name: /Open in an authenticator app/ })
    ).toHaveAttribute('href', enrollment.body.otpauthUrl);

    await click('Copy setup key');
    expect(clipboard.writeText).toHaveBeenCalledWith('JBSWY3DPEHPK3PXPJBSWY3DP');
    expect(text()).toContain('Setup key copied.');

    await typeCode('123456');
    await submit();

    expect(bodyOf(adapter, 'POST', '/totp/enroll/verify')).toEqual({ code: '123456' });
    expect(heading()).toBe('Authenticator app added');
    expect(screen.getByRole('status').textContent).toContain('sign in with a code');

    await click('Continue');
    expect(nav.current).toBe('app');
    expect(nav.path).toBe('/settings');
  });

  it('reports a refused code and a failed copy, and lets the user go back', async () => {
    clipboard.writeText.mockRejectedValue(new Error('denied'));
    await open(
      'registerAuthenticator',
      { 'POST /totp/enroll/start': enrollment, 'POST /totp/enroll/verify': totpRefused },
      { state: { returnTo: '/settings' } }
    );
    await waitSettled();

    await click('Copy setup key');
    expect(text()).toContain('Could not copy.');

    await submit();
    expect(screen.getByRole('alert').textContent).toContain('Enter the 6-digit code');

    await typeCode('123456');
    await submit();
    expect(screen.getByRole('alert').textContent).toContain('That code did not work.');
    expect(heading()).toBe('Set up an authenticator app');

    await click('Back');
    expect(nav.current).toBe('registerPasskey');
    expect(nav.state).toEqual({ returnTo: '/settings' });
  });

  it('explains an enrollment that cannot start, and retries it', async () => {
    let reply: AdapterReply = { status: 409, body: { error: 'secret_required' } };
    await open('registerAuthenticator', { 'POST /totp/enroll/start': () => reply });
    await waitSettled();

    expect(screen.getByRole('alert').textContent).toContain(
      'Authenticator apps are not available'
    );

    reply = {
      body: { ...enrollment.body, otpauthUrl: 'javascript:alert(1)' },
    };
    await click('Try again');
    expect(screen.getByRole('img', { name: /QR code/ })).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('is offered when the device cannot register a passkey', async () => {
    await open('registerPasskey', {
      'GET /system-config/public': { body: { loginMethods: ['passkey'] } },
    });
    await waitSettled();

    expect(text()).toContain('requires one to sign in');
    await click('Use an authenticator app');
    expect(nav.current).toBe('registerAuthenticator');
  });

  it('lets a recovery session finish with an authenticator app, and never skip', async () => {
    let recovery = true;
    const { auth } = await open(
      'registerPasskey',
      {
        'GET /users/me': () => ({ body: { ...(signedIn.body as object), recovery } }),
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
        'POST /totp/enroll/start': enrollment,
        'POST /totp/enroll/verify': () => {
          recovery = false;
          return ok;
        },
        'POST /refresh': ok,
      },
      { passkeys: true }
    );
    await waitSettled();

    expect(auth.recoverySession).toBe(true);
    expect(heading()).toBe('Secure Your Account with a Passkey');
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();

    await click('Use an authenticator app');
    await waitSettled();
    await typeCode('123456');
    await submit();

    expect(heading()).toBe('Authenticator app added');
    expect(auth.recoverySession).toBe(false);
  });

  it('gives a recovery session on a device without passkeys a way forward', async () => {
    await open('registerPasskey', {
      'GET /users/me': { body: { ...(signedIn.body as object), recovery: true } },
      'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
    });
    await waitSettled();

    expect(text()).toContain(
      'Set up an authenticator app to finish securing your account.'
    );
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    expect(button('Use an authenticator app')).toBeInTheDocument();
  });
});

describe('authenticator app settings', () => {
  const status = (enabled: boolean) => ({
    body: {
      enabled,
      verifiedAt: enabled ? '2026-10-01T12:00:00.000Z' : null,
      lastUsedAt: enabled ? '2026-10-20T12:00:00.000Z' : null,
    },
  });

  it('sets one up', async () => {
    let enabled = false;
    await open('settings', {
      'GET /users/me': signedIn,
      'GET /totp/status': () => status(enabled),
      'POST /totp/enroll/start': enrollment,
      'POST /totp/enroll/verify': () => {
        enabled = true;
        return ok;
      },
    });
    await waitSettled();

    expect(heading()).toBe('Authenticator app');
    expect(text()).toContain('Not set up.');

    await click('Set up authenticator app');
    await waitSettled();
    expect(screen.getByRole('img', { name: /QR code/ })).toBeInTheDocument();

    await click('Cancel');
    expect(text()).toContain('Not set up.');

    await click('Set up authenticator app');
    await waitSettled();
    await typeCode('123456');
    await submit();

    expect(screen.getByRole('status').textContent).toContain('Authenticator app added.');
    expect(text()).toContain('On, added ');
    expect(text()).toContain('last used ');
  });

  it('turns one off with a current code', async () => {
    let enabled = true;
    let reply: AdapterReply = totpRefused;
    const { adapter } = await open('settings', {
      'GET /users/me': signedIn,
      'GET /totp/status': () => status(enabled),
      'POST /totp/disable': () => {
        if (reply === ok) enabled = false;
        return reply;
      },
    });
    await waitSettled();

    await click('Turn off');
    await submit();
    expect(screen.getByRole('alert').textContent).toContain('Enter the 6-digit code');
    expect(adapter.called('POST', '/totp/disable')).toHaveLength(0);

    await typeCode('123456');
    await submit();
    expect(screen.getByRole('alert').textContent).toContain('That code did not work.');

    reply = ok;
    await typeCode('234567');
    await submit();

    expect(bodyOf(adapter, 'POST', '/totp/disable')).toEqual({ code: '123456' });
    expect(adapter.called('POST', '/totp/disable')).toHaveLength(2);
    expect(screen.getByRole('status').textContent).toContain(
      'Authenticator app turned off.'
    );
    expect(text()).toContain('Not set up.');
  });

  it('retries a status that will not load', async () => {
    let reply: AdapterReply = { status: 500 };
    await open('settings', {
      'GET /users/me': signedIn,
      'GET /totp/status': () => reply,
    });
    await waitSettled();

    expect(screen.getByRole('alert').textContent).toContain(
      'Could not load your authenticator app.'
    );

    reply = status(false);
    await click('Try again');
    expect(text()).toContain('Not set up.');
  });
});

describe('stylesheet', () => {
  it('adds the stylesheet with a nonce, or not at all', async () => {
    await open('passkeyLogin', {}, { config: { cspNonce: 'n0nce' } });
    expect(
      (document.getElementById('seamless-auth-styles') as HTMLStyleElement).nonce
    ).toBe('n0nce');
    cleanup();
    document.getElementById('seamless-auth-styles')?.remove();

    await open('passkeyLogin', {}, { config: { injectStyles: false } });
    expect(document.getElementById('seamless-auth-styles')).toBeNull();
  });
});
