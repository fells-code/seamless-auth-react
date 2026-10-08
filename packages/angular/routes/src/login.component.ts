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
  linkedSignal,
  signal,
} from '@angular/core';
import { SeamlessAuth } from '@seamless-auth/angular';
import {
  beginSignIn,
  isValidEmail,
  isValidPhoneNumber,
  PASSKEY_SIGN_IN_FAILED,
  registerWithEmail,
  type LoginMethod,
} from '@seamless-auth/client';

import { SaAuthLayout } from './auth-layout.component';
import { SaFallbackOptions } from './fallback-options.component';
import { injectAuthNavigation } from './navigation';
import { SaOAuthProviderButtons } from './oauth-provider-buttons.component';
import { authRoutePaths } from './paths';

/** Sign in with an email or phone number, or create an account with an email. */
@Component({
  selector: 'sa-login',
  imports: [SaAuthLayout, SaFallbackOptions, SaOAuthProviderButtons],
  template: `
    <sa-auth-layout>
      <h2 class="sa-heading">{{ mode() === 'login' ? 'Sign In' : 'Create Account' }}</h2>

      <form (submit)="submit($event)">
        @if (mode() === 'login') {
          <div class="sa-input-group">
            <label for="identifier" class="sa-label">Email Address / Phone Number</label>
            <input
              id="identifier"
              type="text"
              class="sa-input"
              autocomplete="off"
              placeholder="Email or Phone Number"
              required
              [value]="identifier()"
              (input)="identifier.set(valueOf($event))"
              (blur)="validateIdentifier()"
            />
            <p class="sa-helper-text">
              Phone numbers must include a country code e.g. +1
            </p>

            @if (showFallbackOptions()) {
              <sa-fallback-options
                [identifier]="identifier()"
                [loginMethods]="loginMethods()"
                [offerPasskeyRetry]="auth.passkeySupported()"
                (magicLink)="sendMagicLink()"
                (emailOtp)="sendEmailOtp()"
                (phoneOtp)="sendPhoneOtp()"
                (passkeyRetry)="retryPasskey()"
              />
            }

            @if (identifierError()) {
              <p class="sa-error">{{ identifierError() }}</p>
            }
          </div>
        } @else {
          <div class="sa-input-group">
            <label for="email" class="sa-label">Email Address</label>
            <input
              id="email"
              type="email"
              class="sa-input"
              autocomplete="off"
              required
              [value]="email()"
              (input)="email.set(valueOf($event))"
              (blur)="validateEmail()"
            />
            @if (emailError()) {
              <p class="sa-error">{{ emailError() }}</p>
            }
          </div>
        }

        <button
          type="submit"
          class="sa-button"
          [disabled]="!canSubmit() || submitting()"
          aria-describedby="seamless-submit-hint"
        >
          {{ mode() === 'login' ? 'Login' : 'Register' }}
        </button>
        <p id="seamless-submit-hint" role="status" class="sa-submit-hint">
          {{ submitHint() }}
        </p>
        @if (formError()) {
          <p class="sa-error">{{ formError() }}</p>
        }
        <button type="button" class="sa-link" (click)="toggleMode()">
          {{
            mode() === 'login'
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign in'
          }}
        </button>
      </form>

      <sa-oauth-provider-buttons />
    </sa-auth-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaLogin {
  protected readonly auth = inject(SeamlessAuth);
  private readonly navigation = injectAuthNavigation();

  /** Opens on Sign In for a browser that has signed in before. */
  readonly mode = linkedSignal<'login' | 'register'>(() =>
    this.auth.hasSignedInBefore() ? 'login' : 'register'
  );
  readonly identifier = signal('');
  readonly email = signal('');
  readonly identifierError = signal('');
  readonly emailError = signal('');
  readonly formError = signal('');
  readonly showFallbackOptions = signal(false);
  readonly loginMethods = signal<LoginMethod[] | null>(null);
  readonly submitting = signal(false);

  readonly canSubmit = computed(() =>
    this.mode() === 'login'
      ? isValidEmail(this.identifier()) || isValidPhoneNumber(this.identifier())
      : // Registration only needs a valid email. A phone can be added later.
        isValidEmail(this.email())
  );

  // A disabled button is skipped by screen readers and explains nothing to
  // anyone else, so the reason it is refusing lives in a live region instead.
  readonly submitHint = computed(() => {
    if (this.mode() === 'login') {
      if (!this.identifier()) return 'Enter your email or phone number to continue.';
      return this.canSubmit()
        ? 'Ready to continue.'
        : 'This does not look like a complete email or phone number yet.';
    }

    if (!this.email()) return 'Enter your email address to continue.';
    return this.canSubmit()
      ? 'Ready to continue.'
      : 'This does not look like a complete email address yet.';
  });

  constructor() {
    afterNextRender(() => {
      void this.auth.loadLoginMethods();
      void this.auth.checkPasskeySupport();
    });
  }

  valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  toggleMode() {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
  }

  validateIdentifier() {
    const value = this.identifier();
    if (!value) return;
    this.identifierError.set(
      isValidEmail(value) || isValidPhoneNumber(value)
        ? ''
        : 'Please enter a valid email or phone number'
    );
  }

  validateEmail() {
    const value = this.email();
    if (!value) return;
    this.emailError.set(isValidEmail(value) ? '' : 'Please enter a valid email');
  }

  async submit(event: Event) {
    event.preventDefault();
    if (!this.canSubmit() || this.submitting()) return;

    this.formError.set('');
    this.showFallbackOptions.set(false);
    this.submitting.set(true);

    try {
      if (this.mode() === 'register') {
        const { error } = await registerWithEmail(this.auth.client, this.email());

        if (error) {
          this.formError.set(error);
          return;
        }

        await this.navigation.toScreen(authRoutePaths.verifyEmailOtp);
        return;
      }

      // Both are cached, so awaiting them here costs nothing once loaded and
      // removes the race where a fast submit saw passkeys as unsupported.
      const [passkeySupported, configuredMethods] = await Promise.all([
        this.auth.checkPasskeySupport(),
        this.auth.loadLoginMethods(),
      ]);

      const step = await beginSignIn(this.auth, {
        identifier: this.identifier(),
        passkeySupported,
        configuredMethods,
      });

      if (step.kind === 'error') {
        this.formError.set(step.message);
        return;
      }

      if (step.kind === 'signed_in') {
        await this.navigation.toApp();
        return;
      }

      this.loginMethods.set(step.loginMethods);
      this.showFallbackOptions.set(true);

      if (step.passkeyFailed) {
        this.formError.set(PASSKEY_SIGN_IN_FAILED);
      }
    } catch {
      // Backstop for unexpected errors only. The client reports request
      // failures through `error`, not by throwing.
      this.formError.set('Failed to continue sign-in. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  async retryPasskey() {
    this.formError.set('');
    const { error } = await this.auth.handlePasskeyLogin();

    if (error) {
      this.formError.set(PASSKEY_SIGN_IN_FAILED);
      return;
    }

    await this.navigation.toApp();
  }

  async sendMagicLink() {
    const { error } = await this.auth.client.requestMagicLink();

    if (error) {
      this.formError.set('Failed to send magic link.');
      return;
    }

    await this.navigation.toScreen(authRoutePaths.magicLinkSent, {
      identifier: this.identifier(),
    });
  }

  async sendEmailOtp() {
    const { error } = await this.auth.client.requestLoginEmailOtp();

    if (error) {
      this.formError.set('Failed to send email code.');
      return;
    }

    await this.navigation.toScreen(authRoutePaths.verifyEmailOtp, { flow: 'login' });
  }

  async sendPhoneOtp() {
    const { error } = await this.auth.client.requestLoginPhoneOtp();

    if (error) {
      this.formError.set('Failed to send OTP.');
      return;
    }

    await this.navigation.toScreen(authRoutePaths.verifyPhoneOtp, { flow: 'login' });
  }
}
