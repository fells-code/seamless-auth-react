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

import { createSeamlessAuth } from '../src';
import { createSeamlessAuthRoutes, SaOtpInput } from '../src/router';
import {
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
  } = {}
) {
  const adapter = createAdapter({ 'GET /users/me': signedOut, ...routes });
  const passkeys = passkeyPort(options.passkeys ?? false);

  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Home },
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
