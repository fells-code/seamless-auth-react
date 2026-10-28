/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  fallbackSignInOptions,
  hasFallbackSignInOption,
  type LoginMethod,
} from '@seamless-auth/client';

/** The other ways to sign in, offered when a passkey is not the way in. */
@Component({
  selector: 'sa-fallback-options',
  template: `
    @if (visible()) {
      <div class="sa-fallback">
        <div class="sa-fallback-header">Choose a sign-in method</div>
        <p class="sa-fallback-description">Choose another secure sign-in method.</p>

        <div class="sa-actions">
          @if (options().magicLink) {
            <button type="button" class="sa-action" (click)="magicLink.emit()">
              <span class="sa-action-title">Email Magic Link</span>
              <span class="sa-action-subtext"
                >Send a secure sign-in link to your email</span
              >
            </button>
          }
          @if (options().emailOtp) {
            <button type="button" class="sa-action" (click)="emailOtp.emit()">
              <span class="sa-action-title">Email Code</span>
              <span class="sa-action-subtext">Receive a one-time code by email</span>
            </button>
          }
          @if (options().phoneOtp) {
            <button type="button" class="sa-action" (click)="phoneOtp.emit()">
              <span class="sa-action-title">Text Message Code</span>
              <span class="sa-action-subtext">Receive a one-time code via SMS</span>
            </button>
          }
          @if (offerAuthenticator()) {
            <button type="button" class="sa-action" (click)="authenticator.emit()">
              <span class="sa-action-title">Use an authenticator app</span>
              <span class="sa-action-subtext"
                >Enter the code from your authenticator app</span
              >
            </button>
          }
        </div>

        @if (options().passkeyRetry) {
          <button type="button" class="sa-link" (click)="passkeyRetry.emit()">
            Try passkey anyway
          </button>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaFallbackOptions {
  readonly identifier = input.required<string>();
  /** Null while the methods are unknown; the options then stay permissive. */
  readonly loginMethods = input<LoginMethod[] | null>(null);
  readonly offerEmailOtp = input(true);
  readonly offerPasskeyRetry = input(false);
  /**
   * Offer an authenticator app code. Only while a sign-in is in progress: the
   * code finishes the sign-in `login()` started.
   */
  readonly offerAuthenticator = input(false);

  readonly magicLink = output<void>();
  readonly emailOtp = output<void>();
  readonly phoneOtp = output<void>();
  readonly passkeyRetry = output<void>();
  readonly authenticator = output<void>();

  readonly options = computed(() =>
    fallbackSignInOptions(this.identifier(), this.loginMethods(), {
      emailOtp: this.offerEmailOtp(),
      passkeyRetry: this.offerPasskeyRetry(),
    })
  );

  readonly visible = computed(
    () => this.offerAuthenticator() || hasFallbackSignInOption(this.options())
  );
}
