/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { SeamlessAuth } from '@seamless-auth/angular';
import {
  TOTP_CODE_LENGTH,
  totpErrorMessage,
  type TotpStatus,
} from '@seamless-auth/client';

import { SaAuthLayout } from './auth-layout.component';
import { SaAuthenticatorEnrollment } from './authenticator-enrollment.component';
import { SaOtpInput } from './otp-input.component';

/**
 * Turns an authenticator app on or off for the signed-in account, for an
 * account settings page. Needs no router. Turning it off takes a current code
 * from the app as its proof.
 */
@Component({
  selector: 'sa-authenticator-app-settings',
  imports: [SaAuthLayout, SaAuthenticatorEnrollment, SaOtpInput],
  template: `
    <sa-auth-layout [card]="card()">
      <section aria-labelledby="sa-authenticator-settings-heading">
        <h2 id="sa-authenticator-settings-heading" class="sa-heading">
          Authenticator App
        </h2>

        @if (message()) {
          <p class="sa-success" role="status">{{ message() }}</p>
        }

        @switch (view()) {
          @case ('loading') {
            <div class="sa-center">
              <div class="sa-spinner" aria-hidden="true"></div>
              <span>Checking your authenticator app...</span>
            </div>
          }
          @case ('load_failed') {
            <p class="sa-error" role="alert">{{ error() }}</p>
            <button type="button" class="sa-button" (click)="load()">Try again</button>
          }
          @case ('enrolling') {
            <sa-authenticator-enrollment (enrolled)="enrolled()" />
            <button type="button" class="sa-link" (click)="view.set('off')">
              Cancel
            </button>
          }
          @case ('disabling') {
            <form (submit)="disable($event)">
              <p class="sa-description">
                Enter the current code from your authenticator app to turn it off.
              </p>
              <sa-otp-input
                [(value)]="code"
                [length]="codeLength"
                mode="numeric"
                name="totp-disable"
              />
              @if (error()) {
                <p class="sa-error" role="alert">{{ error() }}</p>
              }
              <button type="submit" class="sa-button" [disabled]="busy()">
                {{ busy() ? 'Turning off...' : 'Turn Off Authenticator App' }}
              </button>
              <button
                type="button"
                class="sa-link"
                [disabled]="busy()"
                (click)="view.set('on')"
              >
                Cancel
              </button>
            </form>
          }
          @case ('on') {
            <p class="sa-description">
              An authenticator app is set up for this account.
              @if (status()?.lastUsedAt; as lastUsed) {
                Last used {{ lastUsed.slice(0, 10) }}.
              }
            </p>
            <button type="button" class="sa-secondary" (click)="startDisable()">
              Turn off
            </button>
          }
          @default {
            <p class="sa-description">
              Use codes from an authenticator app to sign in when a passkey is not at
              hand.
            </p>
            <button type="button" class="sa-button" (click)="startEnroll()">
              Set up authenticator app
            </button>
          }
        }
      </section>
    </sa-auth-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaAuthenticatorAppSettings {
  private readonly auth = inject(SeamlessAuth);

  /** Render inside the screens' card. Off to sit in the application's own layout. */
  readonly card = input(true);

  readonly codeLength = TOTP_CODE_LENGTH;
  readonly view = signal<
    'loading' | 'load_failed' | 'off' | 'enrolling' | 'on' | 'disabling'
  >('loading');
  readonly status = signal<TotpStatus | null>(null);
  readonly code = signal('');
  readonly error = signal('');
  readonly message = signal('');
  readonly busy = signal(false);

  constructor() {
    afterNextRender(() => void this.load());
  }

  async load() {
    this.view.set('loading');
    this.error.set('');

    const { data, error } = await this.auth.client.getTotpStatus();

    if (error) {
      this.error.set(
        totpErrorMessage(
          error,
          'Could not check your authenticator app. Please try again.'
        )
      );
      this.view.set('load_failed');
      return;
    }

    this.status.set(data);
    this.view.set(data.enabled ? 'on' : 'off');
  }

  startEnroll() {
    this.message.set('');
    this.view.set('enrolling');
  }

  async enrolled() {
    await this.load();
    this.message.set('Authenticator app added.');
  }

  startDisable() {
    this.message.set('');
    this.error.set('');
    this.code.set('');
    this.view.set('disabling');
  }

  async disable(event: Event) {
    event.preventDefault();
    if (this.busy()) return;

    const code = this.code().replace(/\s+/g, '');
    if (!new RegExp(`^\\d{${TOTP_CODE_LENGTH}}$`).test(code)) {
      this.error.set(
        `Enter the ${TOTP_CODE_LENGTH}-digit code from your authenticator app.`
      );
      return;
    }

    this.error.set('');
    this.busy.set(true);

    try {
      const { error } = await this.auth.client.disableTotp(code);

      if (error) {
        this.error.set(
          totpErrorMessage(error, 'Could not turn off the authenticator app.')
        );
        this.code.set('');
        return;
      }

      await this.load();
      this.message.set('Authenticator app turned off.');
    } finally {
      this.busy.set(false);
    }
  }
}
