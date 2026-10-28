/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { APP_BASE_HREF, Location } from '@angular/common';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  MAGIC_LINK_SUCCESS_MESSAGE,
  OAUTH_PROVIDER_STORAGE_KEY,
  type OAuthRedirectPort,
} from '@seamless-auth/client';

import { provideSeamlessAuth, SeamlessAuth } from '../src';
import { SaOtpInput, seamlessAuthRoutes } from '../routes/src';
import {
  confirmationRequired,
  createAdapter,
  flush,
  passkeyPort,
  signedIn,
  signedOut,
  type AdapterHandler,
  type AdapterReply,
} from '../../../test-support/fakeAdapter';

@Component({ template: '<p>You are signed in</p>' })
class Home {}

const ok = { body: { message: 'Success' } };

let harness: RouterTestingHarness;

async function open(
  url: string,
  routes: Record<string, AdapterReply | AdapterHandler>,
  options: {
    passkeys?: boolean;
    state?: Record<string, unknown>;
    oauthRedirect?: OAuthRedirectPort;
    baseHref?: string;
  } = {}
) {
  const adapter = createAdapter({ 'GET /users/me': signedOut, ...routes });
  const passkeys = passkeyPort(options.passkeys ?? false);

  TestBed.configureTestingModule({
    providers: [
      provideSeamlessAuth({
        apiHost: 'https://app.example.com',
        fetch: adapter.fetch,
        ports: {
          passkeys,
          ...(options.oauthRedirect ? { oauthRedirect: options.oauthRedirect } : {}),
        },
      }),
      provideRouter([
        { path: '', component: Home },
        { path: 'settings', component: Home },
        ...seamlessAuthRoutes,
      ]),
      ...(options.baseHref
        ? [{ provide: APP_BASE_HREF, useValue: options.baseHref }]
        : []),
    ],
  });

  harness = await RouterTestingHarness.create();
  await TestBed.inject(Router).navigateByUrl(url, { state: options.state });
  await settle();

  return { adapter, passkeys };
}

async function settle() {
  for (let i = 0; i < 6; i++) {
    await flush();
    await harness.fixture.whenStable();
  }
}

const root = () => harness.fixture.nativeElement as HTMLElement;
const text = () => root().textContent ?? '';
const url = () => TestBed.inject(Router).url;

function heading() {
  return root().querySelector('h1, h2')?.textContent?.trim();
}

function button(name: string | RegExp): HTMLButtonElement {
  const match = Array.from(root().querySelectorAll('button')).find(candidate => {
    const label = candidate.textContent?.trim() ?? '';
    return typeof name === 'string' ? label === name : name.test(label);
  });
  if (!match) throw new Error(`No button ${name} in: ${text()}`);
  return match;
}

function type(selector: string, value: string) {
  const input = root().querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`No input ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
}

function typeCode(code: string) {
  const boxes = Array.from(
    root().querySelectorAll<HTMLInputElement>('[aria-label^="Digit"]')
  );
  expect(boxes).toHaveLength(code.length);
  code.split('').forEach((char, i) => {
    boxes[i].value = char;
    boxes[i].dispatchEvent(new Event('input'));
  });
}

async function click(name: string | RegExp) {
  button(name).click();
  await settle();
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
    const { adapter } = await open('/login', {
      'POST /registration/register': ok,
    });

    expect(heading()).toBe('Create Account');
    expect(button('Register').disabled).toBe(true);
    expect(text()).toContain('Enter your email address to continue.');

    type('#email', 'not-an-email');
    await settle();
    expect(text()).toContain('Please enter a valid email');

    type('#email', 'ada@example.com');
    await settle();
    expect(button('Register').disabled).toBe(false);

    await click('Register');

    expect(bodyOf(adapter, 'POST', '/registration/register')).toEqual({
      email: 'ada@example.com',
    });
    expect(url()).toBe('/verify-email-otp');
    expect(heading()).toBe('Verify Your Email');
  });

  it('reports a failed registration', async () => {
    await open('/login', { 'POST /registration/register': { status: 500 } });
    type('#email', 'ada@example.com');
    await settle();
    await click('Register');
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
    type('#identifier', 'ada@example.com');
    await settle();
    await click('Login');

    expect(bodyOf(adapter, 'POST', '/login')).toEqual({
      identifier: 'ada@example.com',
      passkeyAvailable: false,
    });
    expect(text()).toContain('Email Magic Link');
    expect(text()).not.toContain('Text Message Code');

    await click(/Email Code/);
    expect(url()).toBe('/verify-email-otp');
    expect(TestBed.inject(Location).getState()).toMatchObject({ flow: 'login' });
  });

  it('runs the passkey ceremony straight away when it can', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    let session = signedOut;
    const { adapter, passkeys } = await open(
      '/login',
      {
        'GET /users/me': () => session,
        'POST /login': { body: { loginMethods: ['passkey'] } },
        'POST /webAuthn/login/start': {
          body: { challenge: 'abc', allowCredentials: [] },
        },
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

    type('#identifier', 'ada@example.com');
    await settle();
    await click('Login');

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
        'POST /magic-link': ok,
      },
      { passkeys: true }
    );
    passkeys.get.mockRejectedValue(
      Object.assign(new Error('x'), { name: 'NotAllowedError' })
    );

    type('#identifier', 'ada@example.com');
    await settle();
    await click('Login');

    expect(text()).toContain('Passkey sign-in could not be completed');
    await click('Try passkey anyway');
    expect(passkeys.get).toHaveBeenCalledTimes(2);
  });

  it('switches between the two forms', async () => {
    await open('/login', {});
    await click(/Already have an account/);
    expect(heading()).toBe('Sign In');
    type('#identifier', 'nonsense');
    await settle();
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

    type('#identifier', 'ada@example.com');
    await settle();
    await click('Login');
    await click(/Email Magic Link/);

    expect(url()).toBe('/magic-link-sent');
    expect(heading()).toBe('Check your email');
    expect(text()).toContain('ada@example.com');
    expect(button('Resend link').disabled).toBe(true);

    const channel = FakeChannel.instances.at(-1);
    used = true;
    channel?.onmessage?.({ data: { type: MAGIC_LINK_SUCCESS_MESSAGE } });
    await settle();

    expect(url()).toBe('/');
  });

  it('verifies a link exactly once and signs this tab in', async () => {
    const { adapter } = await open('/verify-magiclink?token=t%2F1', {
      'GET /users/me': signedIn,
      'GET /magic-link/verify/t%2F1': ok,
    });

    expect(adapter.called('GET', '/magic-link/verify/t%2F1')).toHaveLength(1);
    expect(text()).toContain('Login verified. Redirecting...');

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
    expect(url()).toBe('/verify-magiclink');
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
    expect(root().querySelector('[role="status"]')?.textContent).toContain(
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

    expect(root().querySelector('[role="alert"]')?.textContent).toContain(
      'We could not confirm this sign-in'
    );
    expect(button('Yes, sign in that device').disabled).toBe(false);
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
  });

  it('reports a missing token', async () => {
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

    await click(/Verify & Continue/);
    expect(text()).toContain('Please enter a valid code.');

    typeCode('abcdef');
    await settle();
    await click(/Verify & Continue/);

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

    typeCode('abcdef');
    await settle();
    await click(/Verify & Continue/);

    expect(url()).toBe('/register-passkey');
    expect(heading()).toBe('Secure Your Account with a Passkey');
  });

  it('reports a rejected code and resends one', async () => {
    const { adapter } = await open('/verify-phone-otp', {
      'POST /otp/verify-phone-otp': { status: 400 },
      'POST /otp/generate-phone-otp': ok,
    });

    expect(heading()).toBe('Verify Your Phone Number');
    typeCode('123456');
    await settle();
    await click(/Verify & Continue/);
    expect(text()).toContain('Verification failed.');

    await click('Resend code to phone');
    expect(adapter.called('POST', '/otp/generate-phone-otp')).toHaveLength(1);
    expect(text()).toContain('Verification SMS has been resent.');
  });

  it('sends the email code after a registration phone code', async () => {
    const { adapter } = await open('/verify-phone-otp', {
      'POST /otp/verify-phone-otp': ok,
      'POST /otp/generate-email-otp': ok,
    });

    typeCode('123456');
    await settle();
    await click(/Verify & Continue/);

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

  it('finishes on the callback screen', async () => {
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
    expect(TestBed.inject(Location).getState()).toMatchObject({ returnTo: '/' });
  });

  it('explains a failed callback', async () => {
    await open('/oauth/callback?code=c1', {});
    expect(heading()).toBe('Sign-in failed');
    expect(text()).toContain('missing required information');
    // The single-use code is not left in the address bar or history.
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

  it('names a policy refusal', async () => {
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

  it('lets a user continue without one when the device cannot, and another method exists', async () => {
    await open('/register-passkey', {
      'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
    });
    expect(heading()).toBe('Passkeys are not available here');
    await click('Continue');
    expect(url()).toBe('/');
  });

  it('does not strand a user when a passkey is the only way in', async () => {
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

@Component({
  imports: [SaOtpInput],
  template: `<sa-otp-input [(value)]="code" mode="numeric" />`,
})
class OtpHost {
  readonly code = signal('');
}

describe('one-time code input', () => {
  it('advances, refuses bad characters, takes a paste and handles backspace', async () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(OtpHost);
    await fixture.whenStable();
    const boxes = () =>
      Array.from(fixture.nativeElement.querySelectorAll('input')) as HTMLInputElement[];

    boxes()[0].value = 'x';
    boxes()[0].dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.code()).toBe('');
    expect(boxes()[0].value).toBe('');

    boxes()[0].value = '4';
    boxes()[0].dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.code()).toBe('4');
    expect(document.activeElement).toBe(boxes()[1]);

    boxes()[1].value = '56';
    boxes()[1].dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.code()).toBe('456');

    const paste = new Event('paste', { bubbles: true }) as Event & {
      clipboardData: { getData: () => string };
    };
    paste.clipboardData = { getData: () => '12-34 56' };
    boxes()[0].dispatchEvent(paste);
    await fixture.whenStable();
    expect(fixture.componentInstance.code()).toBe('123456');

    boxes()[5].dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.code()).toBe('12345');

    boxes()[5].dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.code()).toBe('1234');
    expect(document.activeElement).toBe(boxes()[4]);

    boxes()[4].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(document.activeElement).toBe(boxes()[3]);
    boxes()[3].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(document.activeElement).toBe(boxes()[4]);
  });
});

describe('base href', () => {
  it('does not add the base href twice to an OAuth destination', async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, 'mock');
    await open(
      '/oauth/callback?code=c1&state=s1',
      {
        'POST /oauth/mock/callback': {
          body: { returnTo: 'http://localhost/app/settings?tab=2' },
        },
      },
      { baseHref: '/app/' }
    );
    expect(url()).toBe('/settings?tab=2');
  });
});

describe('mounted under a parent path', () => {
  it('navigates between screens and builds the redirect URI under that path', async () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, 'mock');
    const oauthRedirect = { open: jest.fn().mockResolvedValue({ type: 'navigated' }) };
    const adapter = createAdapter({
      'GET /users/me': signedOut,
      'GET /oauth/providers': {
        body: { providers: [{ id: 'mock', name: 'Mock OIDC' }] },
      },
      'POST /oauth/mock/start': {
        body: { authorizationUrl: 'https://idp.test/authorize' },
      },
      'POST /oauth/mock/callback': { body: { nextStep: 'enroll_passkey' } },
    });

    TestBed.configureTestingModule({
      providers: [
        provideSeamlessAuth({
          apiHost: 'https://app.example.com',
          fetch: adapter.fetch,
          ports: { passkeys: passkeyPort(false), oauthRedirect },
        }),
        provideRouter([
          { path: '', component: Home },
          { path: 'account', children: seamlessAuthRoutes },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/account/login');
    await settle();
    await click('Continue with Mock OIDC');
    expect(oauthRedirect.open).toHaveBeenCalledWith(
      'https://idp.test/authorize',
      'http://localhost/account/oauth/callback'
    );

    await harness.navigateByUrl('/account/oauth/callback?code=c&state=s');
    await settle();
    expect(url()).toBe('/account/register-passkey');
  });
});

const recoverySession: AdapterReply = {
  body: { ...(signedIn.body as object), recovery: true },
};

const enrollment = {
  body: {
    message: 'Success',
    secret: 'JBSWY3DPEHPK3PXPJBSW',
    otpauthUrl: 'otpauth://totp/Seamless:ada%40example.com?secret=JBSWY3DPEHPK3PXPJBSW',
  },
};

describe('authenticator app sign-in', () => {
  it('is offered once a sign-in is in progress, and finishes it with a code', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    let session = signedOut;
    const { adapter } = await open('/login', {
      'GET /users/me': () => session,
      'POST /login': { body: { loginMethods: ['magic_link'] } },
      'POST /totp/verify-login': () => {
        session = signedIn;
        return ok;
      },
    });

    type('#identifier', 'ada@example.com');
    await settle();
    await click('Login');
    await click(/Use an authenticator app/);

    expect(url()).toBe('/authenticator-code');
    expect(heading()).toBe('Enter Authenticator Code');

    typeCode('123456');
    await click('Verify & Continue');

    expect(bodyOf(adapter, 'POST', '/totp/verify-login')).toEqual({ code: '123456' });
    expect(url()).toBe('/');
    expect(text()).toContain('You are signed in');
  });

  it('is offered even when no other fallback is', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    await open('/login', { 'POST /login': { body: { loginMethods: ['passkey'] } } });
    type('#identifier', 'ada@example.com');
    await settle();
    await click('Login');
    expect(text()).toContain('Use an authenticator app');
    expect(text()).not.toContain('Email Magic Link');
  });

  it('refuses an incomplete code without asking the API', async () => {
    const { adapter } = await open('/authenticator-code', {});
    await click('Verify & Continue');
    expect(text()).toContain('Enter the 6-digit code from your authenticator app.');
    expect(adapter.called('POST', '/totp/verify-login')).toHaveLength(0);
  });

  it('explains a wrong or reused code and clears the boxes', async () => {
    await open('/authenticator-code', {
      'POST /totp/verify-login': {
        status: 401,
        body: { error: 'totp_verification_failed' },
      },
    });
    typeCode('123456');
    await settle();
    await click('Verify & Continue');

    expect(text()).toContain('That code did not work.');
    expect(text()).toContain('Each code works once.');
    const boxes = Array.from(
      root().querySelectorAll<HTMLInputElement>('[aria-label^="Digit"]')
    );
    expect(boxes.map(box => box.value).join('')).toBe('');
    expect(url()).toBe('/authenticator-code');
  });

  it('reports a lockout with its wait', async () => {
    await open('/authenticator-code', {
      'POST /totp/verify-login': {
        status: 423,
        body: { error: 'account_locked', retryAfterSeconds: 120 },
      },
    });
    typeCode('123456');
    await click('Verify & Continue');
    expect(text()).toContain('Too many failed attempts. Try again in 2 minutes.');
  });

  it('goes back to the login screen', async () => {
    await open('/authenticator-code', {});
    await click('Back to login');
    expect(url()).toBe('/login');
  });
});

describe('authenticator app enrollment', () => {
  let writeText: jest.Mock;

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  it('shows the QR code, the setup key and a link, then verifies the first code', async () => {
    const { adapter } = await open('/register-authenticator', {
      'GET /users/me': signedIn,
      'POST /totp/enroll/start': enrollment,
      'POST /totp/enroll/verify': ok,
    });

    expect(heading()).toBe('Set Up an Authenticator App');
    const qr = root().querySelector('svg[role="img"]');
    expect(qr?.getAttribute('aria-label')).toBe('QR code for your authenticator app');
    const size = Number(qr?.getAttribute('viewBox')?.split(' ')[2]);
    expect(size).toBeGreaterThan(20);
    expect(qr?.querySelector('rect')?.getAttribute('fill')).toBe('#ffffff');
    expect(qr?.querySelector('path')?.getAttribute('d')).toMatch(/^M/);

    expect(text()).toContain('JBSW Y3DP EHPK 3PXP JBSW');
    const link = Array.from(root().querySelectorAll('a')).find(a =>
      a.textContent?.includes('Open in authenticator app')
    );
    expect(link?.getAttribute('href')).toBe(enrollment.body.otpauthUrl);

    await click('Copy setup key');
    expect(writeText).toHaveBeenCalledWith('JBSWY3DPEHPK3PXPJBSW');
    expect(text()).toContain('Setup key copied.');

    typeCode('654321');
    await click('Verify Code');

    expect(bodyOf(adapter, 'POST', '/totp/enroll/verify')).toEqual({ code: '654321' });
    expect(heading()).toBe('Authenticator App Added');
    await click('Continue');
    expect(url()).toBe('/');
  });

  it('says so when the setup key cannot be copied, and links nothing but otpauth', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    await open('/register-authenticator', {
      'GET /users/me': signedIn,
      'POST /totp/enroll/start': {
        body: { ...enrollment.body, otpauthUrl: 'javascript:alert(1)' },
      },
    });

    expect(text()).not.toContain('Open in authenticator app');
    await click('Copy setup key');
    expect(text()).toContain('Could not copy the setup key.');
  });

  it('refuses an incomplete code and explains a wrong one', async () => {
    const { adapter } = await open('/register-authenticator', {
      'GET /users/me': signedIn,
      'POST /totp/enroll/start': enrollment,
      'POST /totp/enroll/verify': {
        status: 401,
        body: { error: 'totp_verification_failed' },
      },
    });

    await click('Verify Code');
    expect(text()).toContain('Enter the 6-digit code from your authenticator app.');
    expect(adapter.called('POST', '/totp/enroll/verify')).toHaveLength(0);

    typeCode('111111');
    await click('Verify Code');
    expect(text()).toContain('That code did not work.');
    expect(heading()).toBe('Set Up an Authenticator App');
  });

  it('reports a setup that could not start, and tries again', async () => {
    let attempts = 0;
    await open('/register-authenticator', {
      'GET /users/me': signedIn,
      'POST /totp/enroll/start': () =>
        ++attempts === 1
          ? { status: 409, body: { error: 'secret_required' } }
          : enrollment,
    });

    expect(text()).toContain(
      'Authenticator apps are not available for this application yet.'
    );
    await click('Try again');
    expect(text()).toContain('JBSW Y3DP');
  });

  it('lifts a recovery session and continues to the destination it was handed', async () => {
    let session = recoverySession;
    await open(
      '/register-authenticator',
      {
        'GET /users/me': () => session,
        'POST /totp/enroll/start': enrollment,
        'POST /totp/enroll/verify': () => {
          session = signedIn;
          return ok;
        },
        'POST /refresh': ok,
      },
      { passkeys: true, state: { returnTo: '/settings' } }
    );

    expect(text()).toContain('You are signed in to recover your account.');
    typeCode('222222');
    await click('Verify Code');

    expect(TestBed.inject(SeamlessAuth).recoverySession()).toBe(false);
    await click('Continue');
    expect(url()).toBe('/settings');
  });

  it('goes back to passkey enrollment where the device supports one', async () => {
    await open(
      '/register-authenticator',
      {
        'GET /users/me': signedIn,
        'POST /totp/enroll/start': enrollment,
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
      },
      { passkeys: true, state: { returnTo: '/settings' } }
    );
    await click('Use a passkey instead');
    expect(url()).toBe('/register-passkey');
    expect(TestBed.inject(Location).getState()).toMatchObject({ returnTo: '/settings' });
  });
});

describe('passkey enrollment offers an authenticator app', () => {
  it('to a recovery session, which cannot skip', async () => {
    await open(
      '/register-passkey',
      {
        'GET /users/me': recoverySession,
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
        'POST /totp/enroll/start': enrollment,
      },
      { passkeys: true }
    );

    expect(heading()).toBe('Add a New Passkey');
    expect(text()).not.toContain('Skip for now');
    await click('Use an authenticator app');
    expect(url()).toBe('/register-authenticator');
  });

  it('to a recovery session on a device without passkeys', async () => {
    await open('/register-passkey', {
      'GET /users/me': recoverySession,
      'GET /system-config/public': { body: { loginMethods: ['passkey'] } },
    });
    expect(text()).toContain(
      'Add an authenticator app to finish recovering your account.'
    );
    expect(() => button('Continue')).toThrow();
    expect(button('Use an authenticator app').className).toBe('sa-button');
  });

  it('on a device without passkeys, alongside continuing', async () => {
    await open(
      '/register-passkey',
      {
        'GET /users/me': signedIn,
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
      },
      { state: { returnTo: '/settings' } }
    );
    expect(button('Use an authenticator app').className).toBe('sa-secondary');
    await click('Use an authenticator app');
    expect(url()).toBe('/register-authenticator');
    expect(TestBed.inject(Location).getState()).toMatchObject({ returnTo: '/settings' });
  });

  it('not where a passkey is the only way in and recovery is not under way', async () => {
    await open('/register-passkey', {
      'GET /users/me': signedIn,
      'GET /system-config/public': { body: { loginMethods: ['passkey'] } },
    });
    expect(text()).not.toContain('Use an authenticator app');
  });

  it('not to an ordinary sign-up on a device with passkeys', async () => {
    await open(
      '/register-passkey',
      {
        'GET /users/me': signedIn,
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
      },
      { passkeys: true }
    );
    expect(text()).not.toContain('Use an authenticator app');
  });
});
