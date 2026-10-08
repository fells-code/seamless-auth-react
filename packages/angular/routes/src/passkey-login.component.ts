/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SeamlessAuth } from '@seamless-auth/angular';

import { SaAuthLayout } from './auth-layout.component';
import { injectAuthNavigation } from './navigation';

/** Sign in with a passkey alone, without an identifier first. */
@Component({
  selector: 'sa-passkey-login',
  imports: [SaAuthLayout],
  template: `
    <sa-auth-layout>
      <h2 class="sa-heading">Login with Passkey</h2>
      <button type="button" class="sa-button" (click)="signIn()">Use Passkey</button>
      @if (error()) {
        <p class="sa-error">{{ error() }}</p>
      }
    </sa-auth-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaPasskeyLogin {
  private readonly auth = inject(SeamlessAuth);
  private readonly navigation = injectAuthNavigation();

  readonly error = signal('');

  async signIn() {
    this.error.set('');
    const { error } = await this.auth.handlePasskeyLogin();

    if (error) {
      this.error.set(
        'Passkey sign-in could not be completed. Try another sign-in method.'
      );
      return;
    }

    await this.navigation.toApp();
  }
}
