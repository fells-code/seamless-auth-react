/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { TotpStatus } from '@seamless-auth/client';

import { provideSeamlessAuth } from '../src';
import { SaAuthenticatorAppSettings } from '../routes/src';
import {
  createAdapter,
  flush,
  passkeyPort,
  signedIn,
  type AdapterHandler,
  type AdapterReply,
} from '../../../test-support/fakeAdapter';

@Component({
  imports: [SaAuthenticatorAppSettings],
  template: `<sa-authenticator-app-settings [card]="card()" />`,
})
class SettingsPage {
  readonly card = signal(true);
}

const ok = { body: { message: 'Success' } };
const off: { body: TotpStatus } = {
  body: { enabled: false, verifiedAt: null, lastUsedAt: null },
};
const on: { body: TotpStatus } = {
  body: {
    enabled: true,
    verifiedAt: '2026-10-01T09:00:00.000Z',
    lastUsedAt: '2026-10-20T09:00:00.000Z',
  },
};
const enrollment = {
  body: {
    message: 'Success',
    secret: 'JBSWY3DPEHPK3PXP',
    otpauthUrl: 'otpauth://totp/Seamless:ada?secret=JBSWY3DPEHPK3PXP',
  },
};

let fixture: ComponentFixture<SettingsPage>;

async function render(routes: Record<string, AdapterReply | AdapterHandler>) {
  const adapter = createAdapter({ 'GET /users/me': signedIn, ...routes });

  TestBed.configureTestingModule({
    providers: [
      provideSeamlessAuth({
        apiHost: 'https://app.example.com',
        fetch: adapter.fetch,
        ports: { passkeys: passkeyPort(false) },
      }),
    ],
  });

  fixture = TestBed.createComponent(SettingsPage);
  await settle();
  return adapter;
}

async function settle() {
  for (let i = 0; i < 6; i++) {
    await flush();
    await fixture.whenStable();
  }
}

const root = () => fixture.nativeElement as HTMLElement;
const text = () => root().textContent ?? '';

function button(name: string): HTMLButtonElement {
  const match = Array.from(root().querySelectorAll('button')).find(
    candidate => candidate.textContent?.trim() === name
  );
  if (!match) throw new Error(`No button ${name} in: ${text()}`);
  return match;
}

async function click(name: string) {
  button(name).click();
  await settle();
}

async function typeCode(code: string) {
  const boxes = Array.from(
    root().querySelectorAll<HTMLInputElement>('[aria-label^="Digit"]')
  );
  code.split('').forEach((char, i) => {
    boxes[i].value = char;
    boxes[i].dispatchEvent(new Event('input'));
  });
  await settle();
}

describe('authenticator app settings', () => {
  it('sets up an authenticator app when there is none', async () => {
    let status = off;
    const adapter = await render({
      'GET /totp/status': () => status,
      'POST /totp/enroll/start': enrollment,
      'POST /totp/enroll/verify': () => {
        status = on;
        return ok;
      },
    });

    expect(root().querySelector('h2')?.textContent?.trim()).toBe('Authenticator App');
    expect(root().querySelector('.sa-card')).not.toBeNull();
    await click('Set up authenticator app');
    expect(text()).toContain('JBSW Y3DP EHPK 3PXP');

    await typeCode('123456');
    await click('Verify Code');

    expect(adapter.called('POST', '/totp/enroll/verify')).toHaveLength(1);
    expect(text()).toContain('Authenticator app added.');
    expect(text()).toContain('An authenticator app is set up for this account.');
    expect(text()).toContain('Last used 2026-10-20.');
  });

  it('lets setup be cancelled', async () => {
    await render({ 'GET /totp/status': off, 'POST /totp/enroll/start': enrollment });
    await click('Set up authenticator app');
    await click('Cancel');
    expect(button('Set up authenticator app')).toBeDefined();
  });

  it('turns the app off with a current code', async () => {
    let status = on;
    const adapter = await render({
      'GET /totp/status': () => status,
      'POST /totp/disable': () => {
        status = off;
        return ok;
      },
    });

    await click('Turn off');
    expect(text()).toContain('Enter the current code from your authenticator app');

    await click('Turn Off Authenticator App');
    expect(text()).toContain('Enter the 6-digit code from your authenticator app.');
    expect(adapter.called('POST', '/totp/disable')).toHaveLength(0);

    await typeCode('654321');
    await click('Turn Off Authenticator App');

    const [call] = adapter.called('POST', '/totp/disable');
    expect(JSON.parse(String(call.init.body))).toEqual({ code: '654321' });
    expect(text()).toContain('Authenticator app turned off.');
    expect(button('Set up authenticator app')).toBeDefined();
  });

  it('keeps the app on when the code is refused, and can be cancelled', async () => {
    await render({
      'GET /totp/status': {
        body: { ...on.body, lastUsedAt: null },
      },
      'POST /totp/disable': { status: 401, body: { error: 'totp_disable_failed' } },
    });

    expect(text()).not.toContain('Last used');
    await click('Turn off');
    await typeCode('111111');
    await click('Turn Off Authenticator App');
    expect(text()).toContain('That code did not work.');

    await click('Cancel');
    expect(button('Turn off')).toBeDefined();
  });

  it('reports a status it could not read, and tries again', async () => {
    let attempts = 0;
    await render({
      'GET /totp/status': () => (++attempts === 1 ? { status: 500 } : off),
    });

    expect(text()).toContain('Could not check your authenticator app.');
    await click('Try again');
    expect(button('Set up authenticator app')).toBeDefined();
  });

  it('can sit in the application layout instead of a card', async () => {
    await render({ 'GET /totp/status': off });
    fixture.componentInstance.card.set(false);
    await settle();
    expect(root().querySelector('.sa-card')).toBeNull();
  });
});
