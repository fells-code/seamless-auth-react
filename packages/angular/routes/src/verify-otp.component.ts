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
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeamlessAuth } from '@seamless-auth/angular';
import {
  formatCountdown,
  OTP_LENGTH,
  OTP_LIFETIME_SECONDS,
  otpResendFailedMessage,
  requestOtp,
  verifyOtp,
  type OtpChannel,
} from '@seamless-auth/client';

import { SaAuthLayout } from './auth-layout.component';
import { injectAuthNavigation } from './navigation';
import { SaOtpInput } from './otp-input.component';
import { authRoutePaths } from './paths';

const COPY = {
  email: {
    title: 'Verify Your Email',
    subtitle: 'We sent you a verification email. Enter the code below.',
    label: 'Email Verification Code',
    resend: 'Resend code to email',
    resent: 'Verification email has been resent.',
  },
  phone: {
    title: 'Verify Your Phone Number',
    subtitle: 'Enter the code sent to your phone number.',
    label: 'Phone Verification Code',
    resend: 'Resend code to phone',
    resent: 'Verification SMS has been resent.',
  },
} as const;

/**
 * Checks a one-time code sent by email or text message. The route's
 * `data.channel` says which; the previous screen's navigation state says
 * whether this is a sign-in (`flow: 'login'`) or a registration.
 */
@Component({
  selector: 'sa-verify-otp',
  imports: [SaAuthLayout, SaOtpInput],
  template: `
    <sa-auth-layout>
      <h2 class="sa-heading">{{ copy().title }}</h2>
      <p class="sa-subtitle">{{ copy().subtitle }}</p>

      @if (error()) {
        <p class="sa-error">{{ error() }}</p>
      }
      @if (resendMessage()) {
        <p class="sa-success">{{ resendMessage() }}</p>
      }

      <form (submit)="submit($event)">
        <div>
          <span class="sa-label">
            {{ copy().label }}
            <span class="sa-timer">(code expires in {{ countdown() }})</span>
          </span>
          <sa-otp-input
            [(value)]="code"
            [length]="codeLength"
            [mode]="channel === 'email' ? 'text' : 'numeric'"
          />
          <button type="button" class="sa-link" (click)="resend()">
            {{ copy().resend }}
          </button>
        </div>

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
export class SaVerifyOtp {
  private readonly auth = inject(SeamlessAuth);
  private readonly navigation = injectAuthNavigation();

  readonly channel: OtpChannel =
    inject(ActivatedRoute).snapshot.data['channel'] === 'phone' ? 'phone' : 'email';
  private readonly flow =
    this.navigation.state<{ flow: string }>().flow === 'login' ? 'login' : 'register';

  readonly codeLength = OTP_LENGTH;
  readonly copy = computed(() => COPY[this.channel]);
  readonly code = signal('');
  readonly error = signal('');
  readonly resendMessage = signal('');
  readonly loading = signal(false);
  readonly secondsLeft = signal(OTP_LIFETIME_SECONDS);
  readonly countdown = computed(() => formatCountdown(this.secondsLeft()));

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (this.channel === 'email') {
        // The registration screen offers passkey enrolment next, which needs this.
        void this.auth.checkPasskeySupport();
      }

      const timer = setInterval(() => {
        this.secondsLeft.update(seconds => Math.max(0, seconds - 1));
      }, 1000);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
  }

  async resend() {
    this.error.set('');
    this.resendMessage.set('');

    const { error } = await requestOtp(this.auth.client, this.channel, this.flow);

    if (error) {
      this.error.set(otpResendFailedMessage(this.channel));
      return;
    }

    this.resendMessage.set(this.copy().resent);
  }

  async submit(event: Event) {
    event.preventDefault();
    if (this.loading()) return;
    this.error.set('');
    this.loading.set(true);

    try {
      const passkeySupported =
        this.channel === 'email' ? await this.auth.checkPasskeySupport() : false;

      const { next, error } = await verifyOtp(
        { client: this.auth.client, refreshSession: this.auth.refreshSession },
        { channel: this.channel, flow: this.flow, code: this.code(), passkeySupported }
      );

      if (error !== null) {
        this.error.set(error);
        return;
      }

      if (next === 'register_passkey') {
        await this.navigation.toScreen(authRoutePaths.registerPasskey);
      } else if (next === 'verify_email') {
        await this.navigation.toScreen(authRoutePaths.verifyEmailOtp);
      } else {
        await this.navigation.toApp();
      }
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
