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
  start: AuthScreen,
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
