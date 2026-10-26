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
  signal,
} from '@angular/core';
import { SeamlessAuth } from '@seamless-auth/angular';
import { safeReturnPath } from '@seamless-auth/client';

import { SaAuthLayout } from './auth-layout.component';
import { SaAuthenticatorEnrollment } from './authenticator-enrollment.component';
import { injectAuthNavigation } from './navigation';
import { authRoutePaths } from './paths';

/**
 * Adds an authenticator app to a signed-in account, for a device that cannot
 * register a passkey or a recovery session that would rather not. Continues
 * where `register-passkey` does once the app is added.
 */
@Component({
  selector: 'sa-register-authenticator',
  imports: [SaAuthLayout, SaAuthenticatorEnrollment],
  template: `
    <sa-auth-layout>
      @if (done()) {
        <h2 class="sa-heading">Authenticator App Added</h2>
        <p class="sa-success" role="status">
          Your authenticator app is set up. Use its codes to sign in from now on.
        </p>
        <button type="button" class="sa-button" (click)="finish()">Continue</button>
      } @else {
        <h2 class="sa-heading">Set Up an Authenticator App</h2>
        @if (auth.recoverySession()) {
          <p class="sa-subtitle">
            You are signed in to recover your account. Add an authenticator app to finish.
          </p>
        }

        <sa-authenticator-enrollment (enrolled)="done.set(true)" />

        @if (auth.passkeySupported()) {
          <button type="button" class="sa-link" (click)="usePasskey()">
            Use a passkey instead
          </button>
        }
      }
    </sa-auth-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaRegisterAuthenticator {
  protected readonly auth = inject(SeamlessAuth);
  private readonly navigation = injectAuthNavigation();
  private readonly returnTo = this.navigation.state<{ returnTo: unknown }>().returnTo;

  readonly done = signal(false);

  constructor() {
    afterNextRender(() => void this.auth.checkPasskeySupport());
  }

  finish() {
    return this.returnTo === undefined
      ? this.navigation.toApp()
      : this.navigation.toLocation(safeReturnPath(this.returnTo));
  }

  usePasskey() {
    return this.navigation.toScreen(
      authRoutePaths.registerPasskey,
      this.returnTo === undefined ? undefined : { returnTo: this.returnTo }
    );
  }
}
