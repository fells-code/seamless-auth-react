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
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router';

import { createSeamlessAuth, SaAuthenticatorAppSettings } from '../src';
import { createSeamlessAuthRoutes, SaOtpInput } from '../src/router';
import {
  confirmationRequired,
  createAdapter,
  passkeyPort,
  signedIn,
  signedOut,
  type AdapterHandler,
  type AdapterReply,
} from '../../../test-support/fakeAdapter';

const Home = defineComponent({ setup: () => () => h('p', 'You are signed in') });

const ok = { body: { message: 'Success' } };

let wrapper: VueWrapper;
let router: Router;

async function open(
  url: string,
  routes: Record<string, AdapterReply | AdapterHandler>,
  options: {
    passkeys?: boolean;
    state?: Record<string, string>;
    oauthRedirect?: OAuthRedirectPort;
    basePath?: string;
    historyBase?: string;
    config?: Record<string, unknown>;
  } = {}
) {
  const adapter = createAdapter({ 'GET /users/me': signedOut, ...routes });
  const passkeys = passkeyPort(options.passkeys ?? false);

  router = createRouter({
    history: createMemoryHistory(options.historyBase),
    routes: [
      { path: '/', component: Home },
      { path: '/settings', component: Home },
      { path: '/home', component: Home },
      ...createSeamlessAuthRoutes({ basePath: options.basePath }),
    ],
  });

  wrapper = mount(RouterView, {
    attachTo: document.body,
    global: {
      plugins: [
        router,
        createSeamlessAuth({
          apiHost: 'https://app.example.com',
          fetch: adapter.fetch,
          ports: {
            passkeys,
            ...(options.oauthRedirect ? { oauthRedirect: options.oauthRedirect } : {}),
          },
          ...options.config,
        }),
      ],
    },
  });

  await router.push(options.state ? { path: url, state: options.state } : url);
  await settle();

  return { adapter, passkeys };
}

async function settle() {
  for (let i = 0; i < 6; i++) await flushPromises();
}

afterEach(() => wrapper?.unmount());

const text = () => wrapper.text();
const url = () => router.currentRoute.value.fullPath;
const heading = () => wrapper.find('h1, h2').text();

function button(name: string | RegExp) {
  const match = wrapper.findAll('button').find(candidate => {
    const label = candidate.text().trim();
    return typeof name === 'string' ? label === name : name.test(label);
  });
  if (!match) throw new Error(`No button ${name} in: ${text()}`);
  return match;
}

async function click(name: string | RegExp) {
  await button(name).trigger('click');
  await settle();
}

async function submit() {
  await wrapper.find('form').trigger('submit');
  await settle();
}

async function type(selector: string, value: string) {
  const input = wrapper.find(selector);
  await input.setValue(value);
  await input.trigger('blur');
}

async function typeCode(code: string) {
  const boxes = wrapper.findAll('[aria-label^="Digit"]');
  expect(boxes).toHaveLength(code.length);
  for (const [i, char] of code.split('').entries()) {
    await boxes[i].setValue(char);
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
  FakeChannel.instances = [];
  (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = FakeChannel;
});

describe('login screen', () => {
  it('opens on Create Account and starts registration with an email', async () => {
    const { adapter } = await open('/login', { 'POST /registration/register': ok });

    expect(heading()).toBe('Create Account');
    expect(button('Register').attributes('disabled')).toBeDefined();
    expect(text()).toContain('Enter your email address to continue.');
    expect(document.getElementById('seamless-auth-styles')).not.toBeNull();

    await type('#email', 'not-an-email');
    expect(text()).toContain('Please enter a valid email');

    await type('#email', 'ada@example.com');
    expect(button('Register').attributes('disabled')).toBeUndefined();
    await submit();

    expect(bodyOf(adapter, 'POST', '/registration/register')).toEqual({
      email: 'ada@example.com',
    });
    expect(url()).toBe('/verify-email-otp');
    expect(heading()).toBe('Verify Your Email');
  });

  it('reports a failed registration', async () => {
    await open('/login', { 'POST /registration/register': { status: 500 } });
    await type('#email', 'ada@example.com');
    await submit();
    expect(text()).toContain('Failed to register. Please try again.');
    expect(url()).toBe('/login');
  });

  it('opens on Sign In for a browser that signed in before, and offers fallbacks', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    const { adapter } = await open('/login', {
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
    expect(url()).toBe('/verify-email-otp');
    expect(router.options.history.state).toMatchObject({ flow: 'login' });
  });

  it('runs the passkey ceremony straight away when it can', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    let session = signedOut;
    const { adapter, passkeys } = await open(
      '/login',
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
    expect(url()).toBe('/');
    expect(text()).toContain('You are signed in');
  });

  it('falls back when the passkey ceremony fails, and can retry it', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    const { passkeys } = await open(
      '/login',
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
    await open('/login', {});
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
    await open('/login', {
      'GET /users/me': () => (used ? signedIn : signedOut),
      'POST /login': { body: { loginMethods: ['magic_link'] } },
      'POST /magic-link': ok,
      'GET /magic-link/check': () => (used ? ok : { status: 204 }),
    });

    await type('#identifier', 'ada@example.com');
    await submit();
    await click(/Email Magic Link/);

    expect(url()).toBe('/magic-link-sent');
    expect(heading()).toBe('Check your email');
    expect(text()).toContain('ada@example.com');
    expect(button('Resend link').attributes('disabled')).toBeDefined();

    used = true;
    FakeChannel.instances
      .at(-1)
      ?.onmessage?.({ data: { type: MAGIC_LINK_SUCCESS_MESSAGE } });
    await settle();

    expect(url()).toBe('/');
  });

  it('verifies a link exactly once, drops the token from the URL, and signs this tab in', async () => {
    const { adapter } = await open('/verify-magiclink?token=t1', {
      'GET /users/me': signedIn,
      'GET /magic-link/verify/t1': ok,
    });

    expect(adapter.called('GET', '/magic-link/verify/t1')).toHaveLength(1);
    expect(text()).toContain('Login verified. Redirecting...');
    expect(url()).toBe('/verify-magiclink');

    await new Promise(resolve => setTimeout(resolve, 950));
    await settle();
    expect(url()).toBe('/');
  });

  it('says to go back when the link was opened elsewhere', async () => {
    await open('/verify-magiclink?token=t1', {
      'GET /magic-link/verify/t1': ok,
      'GET /magic-link/check': { status: 204 },
    });
    expect(text()).toContain('Return to the device where you requested this link');
  });

  it('asks before signing in the device a link opened elsewhere came from', async () => {
    const { adapter } = await open('/verify-magiclink?token=t1', {
      'GET /magic-link/verify/t1': confirmationRequired,
      'POST /magic-link/verify/t1/confirm': ok,
    });

    expect(heading()).toBe('Confirm this sign-in');
    expect(text()).toContain('A sign-in was requested from an Android device on ');
    expect(text()).not.toContain('Failed to verify token');
    expect(adapter.called('GET', '/magic-link/check')).toHaveLength(0);

    await click('Yes, sign in that device');

    expect(adapter.called('POST', '/magic-link/verify/t1/confirm')).toHaveLength(1);
    expect(wrapper.find('[role="status"]').text()).toContain(
      'You can return to your other device'
    );
    expect(url()).toBe('/verify-magiclink');
  });

  it('reports a confirmation the server refuses', async () => {
    await open('/verify-magiclink?token=t1', {
      'GET /magic-link/verify/t1': confirmationRequired,
      'POST /magic-link/verify/t1/confirm': { status: 400, body: { error: 'Invalid' } },
    });

    await click('Yes, sign in that device');

    expect(wrapper.find('[role="alert"]').text()).toContain(
      'We could not confirm this sign-in'
    );
    expect(button('Yes, sign in that device').attributes('disabled')).toBeUndefined();
  });

  it('leaves a link alone when the reader declines', async () => {
    const { adapter } = await open('/verify-magiclink?token=t1', {
      'GET /magic-link/verify/t1': confirmationRequired,
    });

    await click("No, this wasn't me");

    expect(text()).toContain('You can ignore the email');
    expect(adapter.called('POST', '/magic-link/verify/t1/confirm')).toHaveLength(0);
  });

  it('reports a link that cannot be verified, or no link at all', async () => {
    await open('/verify-magiclink?token=t1', {
      'GET /magic-link/verify/t1': { status: 400 },
    });
    expect(text()).toContain('Failed to verify token');
    wrapper.unmount();

    await open('/verify-magiclink', {});
    expect(text()).toContain('Missing token for verification.');
  });
});

describe('one-time code screen', () => {
  it('signs in with an email code', async () => {
    let session = signedOut;
    const { adapter } = await open(
      '/verify-email-otp',
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
    expect(url()).toBe('/');
  });

  it('leads a registration to passkey enrolment when the device supports it', async () => {
    await open(
      '/verify-email-otp',
      {
        'POST /otp/verify-email-otp': ok,
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
      },
      { passkeys: true }
    );

    await typeCode('abcdef');
    await submit();

    expect(url()).toBe('/register-passkey');
    expect(heading()).toBe('Secure Your Account with a Passkey');
  });

  it('reports a rejected code, resends one, and moves on to the email code', async () => {
    let accept = false;
    const { adapter } = await open('/verify-phone-otp', {
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
    expect(url()).toBe('/verify-email-otp');
  });

  it('reports a failed resend and goes back to login', async () => {
    await open('/verify-email-otp', { 'POST /otp/generate-email-otp': { status: 500 } });
    await click('Resend code to email');
    expect(text()).toContain('Failed to send Email code.');
    await click('Back to login');
    expect(url()).toBe('/login');
  });
});

describe('OAuth', () => {
  it('lists providers and starts a sign-in with the callback screen as redirect URI', async () => {
    const oauthRedirect = { open: jest.fn().mockResolvedValue({ type: 'navigated' }) };
    const { adapter } = await open(
      '/login',
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

    await click('Continue with Mock OIDC');

    expect(bodyOf(adapter, 'POST', '/oauth/mock/start')).toMatchObject({
      redirectUri: 'http://localhost/oauth/callback',
    });
    expect(sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY)).toBe('mock');
    expect(oauthRedirect.open).toHaveBeenCalledWith(
      'https://idp.test/authorize',
      'http://localhost/oauth/callback'
    );
  });

  it('reports a provider that will not start', async () => {
    await open('/login', {
      'GET /oauth/providers': {
        body: { providers: [{ id: 'mock', name: 'Mock OIDC' }] },
      },
      'POST /oauth/mock/start': { status: 500 },
    });
    await click('Continue with Mock OIDC');
    expect(text()).toContain('Could not start sign-in with this provider.');
  });

  it('finishes on the callback screen and keeps the destination in-app', async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, 'mock');
    const { adapter } = await open('/oauth/callback?code=c1&state=s1', {
      'POST /oauth/mock/callback': { body: { returnTo: 'https://evil.test/' } },
    });

    expect(bodyOf(adapter, 'POST', '/oauth/mock/callback')).toMatchObject({
      code: 'c1',
      state: 's1',
    });
    expect(url()).toBe('/');
  });

  it('hands over to passkey enrolment when the API asks for it', async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, 'mock');
    await open('/oauth/callback?code=c1&state=s1', {
      'POST /oauth/mock/callback': { body: { nextStep: 'enroll_passkey' } },
    });
    expect(url()).toBe('/register-passkey');
    expect(router.options.history.state).toMatchObject({ returnTo: '/' });
  });

  it('explains a failed callback without leaving the code in the URL', async () => {
    await open('/oauth/callback?code=c1', {});
    expect(heading()).toBe('Sign-in failed');
    expect(text()).toContain('missing required information');
    expect(url()).toBe('/oauth/callback');
    await click('Back to login');
    expect(url()).toBe('/login');
  });
});

describe('passkey screens', () => {
  it('enrols a passkey and continues to the app', async () => {
    const { adapter, passkeys } = await open(
      '/register-passkey',
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

    expect(text()).not.toContain('Skip for now');
    await click('Register Passkey');

    expect(bodyOf(adapter, 'POST', '/webAuthn/register/finish').metadata).toMatchObject({
      friendlyName: expect.any(String),
    });
    expect(url()).toBe('/');
  });

  it('names a policy refusal, and lets the user skip when another method exists', async () => {
    const { passkeys } = await open(
      '/register-passkey',
      {
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
        'GET /webAuthn/register/start': {
          status: 403,
          body: { error: 'attachment_not_allowed' },
        },
      },
      { passkeys: true }
    );

    await click('Use a security key instead');
    expect(text()).toContain('does not accept that kind of authenticator');
    expect(passkeys.create).not.toHaveBeenCalled();

    await click('Skip for now');
    expect(url()).toBe('/');
  });

  it('lets a user continue when the device cannot, and never strands them', async () => {
    await open('/register-passkey', {
      'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
    });
    expect(heading()).toBe('Passkeys are not available here');
    await click('Continue');
    expect(url()).toBe('/');
    wrapper.unmount();

    await open('/register-passkey', {
      'GET /system-config/public': { body: { loginMethods: ['passkey'] } },
    });
    expect(text()).toContain('requires one to sign in');
    expect(() => button('Continue')).toThrow();
  });

  it('signs in with a passkey alone', async () => {
    const { passkeys } = await open('/passkey-login', {
      'POST /webAuthn/login/start': { status: 500 },
    });
    expect(heading()).toBe('Login with Passkey');
    await click('Use Passkey');
    expect(text()).toContain('Passkey sign-in could not be completed');
    expect(passkeys.get).not.toHaveBeenCalled();
  });
});

describe('mounted under a base path', () => {
  it('navigates by name and builds the redirect URI under that path', async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, 'mock');
    const oauthRedirect = { open: jest.fn().mockResolvedValue({ type: 'navigated' }) };
    await open(
      '/account/login',
      {
        'GET /oauth/providers': {
          body: { providers: [{ id: 'mock', name: 'Mock OIDC' }] },
        },
        'POST /oauth/mock/start': {
          body: { authorizationUrl: 'https://idp.test/authorize' },
        },
        'POST /oauth/mock/callback': { body: { nextStep: 'enroll_passkey' } },
      },
      { oauthRedirect, basePath: '/account/' }
    );

    await click('Continue with Mock OIDC');
    expect(oauthRedirect.open).toHaveBeenCalledWith(
      'https://idp.test/authorize',
      'http://localhost/account/oauth/callback'
    );

    await router.push('/account/oauth/callback?code=c&state=s');
    await settle();
    expect(url()).toBe('/account/register-passkey');
  });
});

describe('review follow-ups', () => {
  it('does not add the router base twice to an OAuth destination', async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, 'mock');
    await open(
      '/oauth/callback?code=c&state=s',
      {
        'POST /oauth/mock/callback': {
          body: { returnTo: 'http://localhost/app/settings?tab=2' },
        },
      },
      { historyBase: '/app' }
    );
    expect(url()).toBe('/settings?tab=2');
  });

  it('goes to signedInPath after enrolment when nothing was handed over', async () => {
    await open(
      '/register-passkey',
      {
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
      },
      { config: { signedInPath: '/home' } }
    );
    await click('Continue');
    expect(url()).toBe('/home');
  });

  it('adds the stylesheet with a nonce, or not at all', async () => {
    document.getElementById('seamless-auth-styles')?.remove();
    await open('/login', {}, { config: { cspNonce: 'n0nce' } });
    expect(
      (document.getElementById('seamless-auth-styles') as HTMLStyleElement).nonce
    ).toBe('n0nce');
    wrapper.unmount();

    document.getElementById('seamless-auth-styles')?.remove();
    await open('/login', {}, { config: { injectStyles: false } });
    expect(document.getElementById('seamless-auth-styles')).toBeNull();
  });
});

describe('one-time code input', () => {
  it('advances, refuses bad characters, takes a paste and handles backspace', async () => {
    const Host = defineComponent({
      setup() {
        const code = ref('');
        return { code };
      },
      render() {
        return h(SaOtpInput, {
          modelValue: this.code,
          'onUpdate:modelValue': (value: string) => {
            this.code = value;
          },
        });
      },
    });
    const host = mount(Host, { attachTo: document.body });
    const boxes = () => host.findAll('input');
    const code = () => (host.vm as unknown as { code: string }).code;

    await boxes()[0].setValue('x');
    expect(code()).toBe('');
    expect((boxes()[0].element as HTMLInputElement).value).toBe('');

    await boxes()[0].setValue('4');
    expect(code()).toBe('4');
    expect(document.activeElement).toBe(boxes()[1].element);

    await boxes()[1].setValue('56');
    expect(code()).toBe('456');

    const paste = new Event('paste', { bubbles: true }) as Event & {
      clipboardData: { getData: () => string };
    };
    paste.clipboardData = { getData: () => '12-34 56' };
    boxes()[0].element.dispatchEvent(paste);
    await flushPromises();
    expect(code()).toBe('123456');

    await boxes()[5].trigger('keydown', { key: 'Backspace' });
    expect(code()).toBe('12345');
    await boxes()[5].trigger('keydown', { key: 'Backspace' });
    expect(code()).toBe('1234');
    expect(document.activeElement).toBe(boxes()[4].element);

    await boxes()[4].trigger('keydown', { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(boxes()[3].element);
    await boxes()[3].trigger('keydown', { key: 'ArrowRight' });
    expect(document.activeElement).toBe(boxes()[4].element);
    host.unmount();
  });
});

const totpSecret = 'JBSWY3DPEHPK3PXP';
const otpauthUrl = `otpauth://totp/Seamless:ada%40example.com?secret=${totpSecret}&issuer=Seamless`;
const enrollmentStart = {
  body: {
    message: 'Success',
    secret: totpSecret,
    otpauthUrl,
    issuer: 'Seamless',
    accountName: 'ada@example.com',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  },
};
const recovering = { body: { ...(signedIn.body as object), recovery: true } };
const totpRefused = { status: 401, body: { error: 'totp_verification_failed' } };

function stubClipboard(writeText: jest.Mock) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
}

describe('authenticator app sign-in', () => {
  it('is offered whenever a sign-in falls back, and reports refused codes', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    let session = signedOut;
    const replies = [
      totpRefused,
      { status: 423, body: { error: 'account_locked', retryAfterSeconds: 120 } },
      { status: 429, body: { error: 'rate_limited' } },
    ];
    const { adapter } = await open('/login', {
      'GET /users/me': () => session,
      'POST /login': { body: { loginMethods: ['magic_link'] } },
      'POST /totp/verify-login': () => {
        const reply = replies.shift();
        if (reply) return reply;
        session = signedIn;
        return ok;
      },
    });

    await type('#identifier', '+14155552671');
    await submit();
    expect(text()).not.toContain('Email Magic Link');
    await click(/Use an authenticator app/);

    expect(url()).toBe('/authenticator-code');
    expect(heading()).toBe('Enter Your Authenticator Code');

    await submit();
    expect(text()).toContain('Enter the 6-digit code from your authenticator app.');
    expect(adapter.called('POST', '/totp/verify-login')).toHaveLength(0);

    await typeCode('123456');
    await submit();
    expect(bodyOf(adapter, 'POST', '/totp/verify-login')).toEqual({ code: '123456' });
    expect(wrapper.find('[role="alert"]').text()).toContain('Each code works once.');

    await typeCode('234567');
    await submit();
    expect(text()).toContain('Too many failed attempts. Try again in 2 minutes.');

    await typeCode('345678');
    await submit();
    expect(text()).toContain('Too many attempts. Wait a moment');

    await typeCode('456789');
    await submit();
    expect(url()).toBe('/');
    expect(text()).toContain('You are signed in');
  });

  it('goes back to login', async () => {
    await open('/authenticator-code', {});
    await click('Back to login');
    expect(url()).toBe('/login');
  });
});

describe('authenticator app enrollment', () => {
  it('lets a recovery session on a device without passkeys finish with one', async () => {
    let session: AdapterReply = recovering;
    const writeText = jest.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const { adapter } = await open(
      '/register-passkey',
      {
        'GET /users/me': () => session,
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
        'POST /totp/enroll/start': enrollmentStart,
        'POST /totp/enroll/verify': init => {
          if (JSON.parse(String(init.body)).code !== '654321') return totpRefused;
          session = signedIn;
          return ok;
        },
      },
      { state: { returnTo: '/settings' } }
    );

    expect(heading()).toBe('Passkeys are not available here');
    expect(text()).toContain('finish recovering your account');
    expect(() => button('Continue')).toThrow();
    await click('Use an authenticator app');

    expect(url()).toBe('/register-authenticator');
    expect(heading()).toBe('Set Up an Authenticator App');
    const svg = wrapper.find('svg[role="img"]');
    expect(svg.attributes('viewBox')).toMatch(/^0 0 \d+ \d+$/);
    expect(svg.find('rect').attributes('fill')).toBe('#ffffff');
    expect(svg.find('path').attributes('d')).toMatch(/^M/);
    expect(text()).toContain('JBSW Y3DP EHPK 3PXP');
    expect(wrapper.find('a').attributes('href')).toBe(otpauthUrl);

    await click('Copy key');
    expect(writeText).toHaveBeenCalledWith(totpSecret);
    expect(text()).toContain('Key copied.');

    writeText.mockRejectedValueOnce(new Error('denied'));
    await click('Copy key');
    expect(text()).toContain('Could not copy the key');

    await submit();
    expect(text()).toContain('Enter the 6-digit code from your authenticator app.');

    await typeCode('111111');
    await submit();
    expect(text()).toContain('That code did not work.');

    await typeCode('654321');
    await submit();
    expect(heading()).toBe('Authenticator App Added');
    expect(adapter.called('GET', '/users/me').length).toBeGreaterThan(1);

    await click('Continue');
    expect(url()).toBe('/settings');
  });

  it('offers it beside a passkey to a recovery session, which cannot skip', async () => {
    await open(
      '/register-passkey',
      {
        'GET /users/me': recovering,
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
        'POST /totp/enroll/start': enrollmentStart,
      },
      { passkeys: true }
    );

    expect(text()).toContain('Register a passkey or set up an authenticator app');
    expect(text()).not.toContain('Skip for now');
    await click('Use an authenticator app');
    expect(url()).toBe('/register-authenticator');

    await click('Back');
    expect(url()).toBe('/register-passkey');
  });

  it('is not offered beside a passkey outside recovery, and is when the device cannot', async () => {
    await open(
      '/register-passkey',
      {
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
      },
      { passkeys: true }
    );
    expect(text()).not.toContain('Use an authenticator app');
    wrapper.unmount();

    await open('/register-passkey', {
      'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
    });
    expect(button('Continue')).toBeDefined();
    await click('Use an authenticator app');
    expect(url()).toBe('/register-authenticator');
  });

  it('explains an enrollment that will not start, and tries again', async () => {
    const replies: AdapterReply[] = [
      { status: 409, body: { error: 'secret_required' } },
      { status: 500 },
      enrollmentStart,
    ];
    await open('/register-authenticator', {
      'POST /totp/enroll/start': () => replies.shift(),
    });

    expect(wrapper.find('[role="alert"]').text()).toBe(
      'Authenticator apps are not available for this application yet.'
    );
    await click('Try again');
    expect(text()).toContain('Could not start setting up an authenticator app');
    await click('Try again');
    expect(text()).toContain('JBSW Y3DP EHPK 3PXP');
  });

  it('goes to signedInPath once added when nothing was handed over', async () => {
    await open(
      '/register-authenticator',
      { 'POST /totp/enroll/start': enrollmentStart, 'POST /totp/enroll/verify': ok },
      { config: { signedInPath: '/home' } }
    );
    await typeCode('654321');
    await submit();
    await click('Continue');
    expect(url()).toBe('/home');
  });
});

describe('authenticator app settings', () => {
  async function mountSettings(routes: Record<string, AdapterReply | AdapterHandler>) {
    const adapter = createAdapter({ 'GET /users/me': signedIn, ...routes });
    wrapper = mount(SaAuthenticatorAppSettings, {
      attachTo: document.body,
      global: {
        plugins: [
          createSeamlessAuth({
            apiHost: 'https://app.example.com',
            fetch: adapter.fetch,
            ports: { passkeys: passkeyPort(false) },
          }),
        ],
      },
    });
    await settle();
    return adapter;
  }

  it('adds an authenticator app, then turns it off with a current code', async () => {
    let enabled = false;
    const statuses: AdapterReply[] = [{ status: 500 }];
    const adapter = await mountSettings({
      'GET /totp/status': () =>
        statuses.shift() ?? {
          body: {
            enabled,
            verifiedAt: enabled ? '2026-10-20T10:00:00.000Z' : null,
            lastUsedAt: enabled ? '2026-10-21T10:00:00.000Z' : null,
          },
        },
      'POST /totp/enroll/start': enrollmentStart,
      'POST /totp/enroll/verify': () => {
        enabled = true;
        return ok;
      },
      'POST /totp/disable': init => {
        if (JSON.parse(String(init.body)).code !== '222222')
          return { status: 401, body: { error: 'totp_disable_failed' } };
        enabled = false;
        return ok;
      },
    });

    expect(heading()).toBe('Authenticator App');
    expect(text()).toContain('Could not load your authenticator app status.');
    await click('Try again');

    await click('Set up authenticator app');
    expect(text()).toContain('JBSW Y3DP EHPK 3PXP');
    await click('Cancel');
    expect(text()).not.toContain('JBSW Y3DP EHPK 3PXP');

    await click('Set up authenticator app');
    await typeCode('654321');
    await submit();
    expect(text()).toContain('Authenticator app added.');
    expect(text()).toContain('An authenticator app is set up for this account.');
    expect(text()).toContain('Last used');

    await click('Turn off');
    await submit();
    expect(text()).toContain('Enter the 6-digit code from your authenticator app.');
    expect(adapter.called('POST', '/totp/disable')).toHaveLength(0);

    await typeCode('111111');
    await submit();
    expect(text()).toContain('That code did not work.');

    await click('Cancel');
    await click('Turn off');
    await typeCode('222222');
    await submit();
    expect(bodyOf(adapter, 'POST', '/totp/disable')).toEqual({ code: '111111' });
    expect(text()).toContain('Authenticator app turned off.');
    expect(button('Set up authenticator app')).toBeDefined();
  });
});
