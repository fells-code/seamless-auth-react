/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { SeamlessAuth } from '@seamless-auth/angular';
import {
  enrollPasskey,
  hasNonPasskeyLoginMethod,
  safeReturnPath,
  type PasskeyAttachment,
} from '@seamless-auth/client';

import { SaAuthLayout } from './auth-layout.component';
import { injectAuthNavigation } from './navigation';

/**
 * Offers passkey enrolment to a user who has just signed in. The session
 * already exists by the time this renders, so a passkey is an addition to it,
 * which is what makes leaving without one a legitimate way to finish.
 */
@Component({
  selector: 'sa-register-passkey',
  imports: [SaAuthLayout],
  template: `
    <sa-auth-layout>
      @if (auth.passkeySupportLoading() || auth.loginMethodsLoading()) {
        <div class="sa-center">
          <div class="sa-spinner" aria-hidden="true"></div>
          <span>Checking for Passkey Support...</span>
        </div>
      } @else if (!auth.passkeySupported()) {
        <h2 class="sa-heading">Passkeys are not available here</h2>
        <p class="sa-description">
          {{
            canSkip()
              ? 'This device does not support passkeys. You can continue without one and add a passkey later from a device that does.'
              : 'This device does not support passkeys, and this application requires one to sign in. Try again from a device or browser that supports them.'
          }}
        </p>
        @if (canSkip()) {
          <button type="button" class="sa-button" (click)="finishWithoutPasskey()">
            Continue
          </button>
        }
      } @else {
        <h2 class="sa-heading">Secure Your Account with a Passkey</h2>
        <p class="sa-description">
          Your device supports passkeys! Register one to skip passwords forever.
        </p>

        <button
          type="button"
          class="sa-button"
          [disabled]="status() === 'loading'"
          (click)="register()"
        >
          {{ status() === 'loading' ? 'Registering...' : 'Register Passkey' }}
        </button>

        <button
          type="button"
          class="sa-secondary"
          [disabled]="status() === 'loading'"
          (click)="register('cross-platform')"
        >
          Use a security key instead
        </button>

        @if (message()) {
          <p [class]="status() === 'success' ? 'sa-success' : 'sa-error'" role="status">
            {{ message() }}
          </p>
        }

        @if (canSkip()) {
          <button
            type="button"
            class="sa-link"
            [disabled]="status() === 'loading'"
            (click)="finishWithoutPasskey()"
          >
            Skip for now
          </button>
        }
      }
    </sa-auth-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaRegisterPasskey {
  protected readonly auth = inject(SeamlessAuth);
  private readonly navigation = injectAuthNavigation();
  // The OAuth callback hands over the caller's destination when the API asks
  // for enrolment first. Without one, the configured signedInPath applies.
  private readonly returnTo = this.navigation.state<{ returnTo: unknown }>().returnTo;

  readonly status = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  readonly message = signal('');

  // With passkey as the only enabled method, a user who skipped would have no
  // way back into the account they just made.
  readonly canSkip = computed(() => hasNonPasskeyLoginMethod(this.auth.loginMethods()));

  constructor() {
    afterNextRender(() => {
      void this.auth.checkPasskeySupport();
      void this.auth.loadLoginMethods();
    });
  }

  async register(attachment?: PasskeyAttachment) {
    this.status.set('loading');

    const { error } = await enrollPasskey(
      { client: this.auth.client, refreshSession: this.auth.refreshSession },
      attachment
    );

    if (error) {
      this.status.set('error');
      this.message.set(error);
      return;
    }

    this.status.set('success');
    this.message.set('Passkey registered successfully.');
    await this.finish();
  }

  private finish() {
    return this.returnTo === undefined
      ? this.navigation.toApp()
      : this.navigation.toLocation(safeReturnPath(this.returnTo));
  }

  async finishWithoutPasskey() {
    await this.auth.refreshSession();
    await this.finish();
  }
}
