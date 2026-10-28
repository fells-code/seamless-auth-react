/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SeamlessAuth } from '@seamless-auth/angular';
import { signInWithTotp, TOTP_CODE_LENGTH } from '@seamless-auth/client';

import { SaAuthLayout } from './auth-layout.component';
import { injectAuthNavigation } from './navigation';
import { SaOtpInput } from './otp-input.component';
import { authRoutePaths } from './paths';

/** Finishes the sign-in the login screen started with an authenticator app code. */
@Component({
  selector: 'sa-authenticator-code',
  imports: [SaAuthLayout, SaOtpInput],
  template: `
    <sa-auth-layout>
      <h2 class="sa-heading">Enter Authenticator Code</h2>
      <p class="sa-subtitle">Open your authenticator app and enter the code it shows.</p>

      @if (error()) {
        <p class="sa-error" role="alert">{{ error() }}</p>
      }

      <form (submit)="submit($event)">
        <span class="sa-label">Authenticator Code</span>
        <sa-otp-input [(value)]="code" [length]="codeLength" mode="numeric" name="totp" />

        <button type="submit" class="sa-button" [disabled]="loading()">
          {{ loading() ? 'Verifying...' : 'Verify & Continue' }}
        </button>

        <button type="button" class="sa-link" (click)="backToLogin()">
          Back to login
        </button>
      </form>
    </sa-auth-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaAuthenticatorCode {
  private readonly auth = inject(SeamlessAuth);
  private readonly navigation = injectAuthNavigation();

  readonly codeLength = TOTP_CODE_LENGTH;
  readonly code = signal('');
  readonly error = signal('');
  readonly loading = signal(false);

  async submit(event: Event) {
    event.preventDefault();
    if (this.loading()) return;
    this.error.set('');
    this.loading.set(true);

    try {
      const { error } = await signInWithTotp(
        { client: this.auth.client, refreshSession: this.auth.refreshSession },
        this.code()
      );

      if (error !== null) {
        this.error.set(error);
        // A retry needs the app's current code, so it starts from empty boxes.
        if (this.code().length === TOTP_CODE_LENGTH) this.code.set('');
        return;
      }

      await this.navigation.toApp();
    } catch {
      // Backstop for unexpected errors only.
      this.error.set('Verification failed.');
    } finally {
      this.loading.set(false);
    }
  }

  backToLogin() {
    void this.navigation.toScreen(authRoutePaths.login);
  }
}
