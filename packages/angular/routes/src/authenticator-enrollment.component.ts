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
  afterRenderEffect,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { SeamlessAuth } from '@seamless-auth/angular';
import {
  formatTotpSecret,
  qrCode,
  TOTP_CODE_LENGTH,
  totpErrorMessage,
  type TotpEnrollmentStartResult,
} from '@seamless-auth/client';

import { SaOtpInput } from './otp-input.component';

/**
 * Adds an authenticator app to the signed-in account: a QR code and the secret
 * to scan or type, then the first code to prove it. Emits `enrolled` once the
 * app is on the account. Holds no navigation, so it works on any screen.
 */
@Component({
  selector: 'sa-authenticator-enrollment',
  imports: [SaOtpInput],
  template: `
    @if (status() === 'starting') {
      <div class="sa-center">
        <div class="sa-spinner" aria-hidden="true"></div>
        <span>Preparing your authenticator app setup...</span>
      </div>
    } @else if (status() === 'start_failed') {
      <p class="sa-error" role="alert">{{ error() }}</p>
      <button type="button" class="sa-button" (click)="start()">Try again</button>
    } @else if (enrollment(); as setup) {
      <p class="sa-description">
        Scan this QR code with your authenticator app, or enter the setup key by hand.
      </p>

      @if (qr(); as code) {
        <svg
          class="sa-qr"
          role="img"
          aria-label="QR code for your authenticator app"
          [attr.viewBox]="'0 0 ' + code.size + ' ' + code.size"
          shape-rendering="crispEdges"
        >
          <rect [attr.width]="code.size" [attr.height]="code.size" fill="#ffffff" />
          <path [attr.d]="code.path" fill="#000000" />
        </svg>
      }

      <div class="sa-input-group">
        <span class="sa-label">Setup key</span>
        <code class="sa-secret">{{ formattedSecret() }}</code>
        <button type="button" class="sa-secondary" (click)="copySecret(setup.secret)">
          Copy setup key
        </button>
        @if (otpauthUrl()) {
          <a #otpauthLink class="sa-link sa-otpauth">Open in authenticator app</a>
        }
        @if (copyMessage()) {
          <p class="sa-helper-text" role="status">{{ copyMessage() }}</p>
        }
      </div>

      <form (submit)="verify($event)">
        <span class="sa-label">Enter the code your app shows</span>
        <sa-otp-input
          [(value)]="code"
          [length]="codeLength"
          mode="numeric"
          name="totp-enroll"
        />

        @if (error()) {
          <p class="sa-error" role="alert">{{ error() }}</p>
        }

        <button type="submit" class="sa-button" [disabled]="status() === 'verifying'">
          {{ status() === 'verifying' ? 'Verifying...' : 'Verify Code' }}
        </button>
      </form>
    }
  `,
  styles: `
    .sa-qr {
      display: block;
      width: 12rem;
      height: 12rem;
      margin: 0 auto 1rem;
    }
    .sa-secret {
      display: block;
      margin: 0.25rem 0;
      font-size: 1rem;
      letter-spacing: 0.05em;
      word-break: break-all;
    }
    .sa-otpauth {
      display: block;
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaAuthenticatorEnrollment {
  private readonly auth = inject(SeamlessAuth);
  private readonly otpauthLink = viewChild<ElementRef<HTMLAnchorElement>>('otpauthLink');

  readonly enrolled = output<void>();

  readonly codeLength = TOTP_CODE_LENGTH;
  readonly status = signal<'starting' | 'start_failed' | 'ready' | 'verifying'>(
    'starting'
  );
  readonly enrollment = signal<TotpEnrollmentStartResult | null>(null);
  readonly code = signal('');
  readonly error = signal('');
  readonly copyMessage = signal('');

  readonly qr = computed(() => {
    const setup = this.enrollment();
    return setup ? qrCode(setup.otpauthUrl) : null;
  });
  readonly formattedSecret = computed(() =>
    formatTotpSecret(this.enrollment()?.secret ?? '')
  );
  readonly otpauthUrl = computed(() => {
    const url = this.enrollment()?.otpauthUrl ?? '';
    return /^otpauth:\/\//i.test(url) ? url : null;
  });

  constructor() {
    // Angular's URL sanitizer rewrites the otpauth scheme as unsafe, so the
    // href is set directly, and only for a URL already checked to be otpauth.
    afterRenderEffect(() => {
      const anchor = this.otpauthLink()?.nativeElement;
      const url = this.otpauthUrl();
      if (anchor && url) anchor.href = url;
    });
    afterNextRender(() => void this.start());
  }

  async start() {
    this.status.set('starting');
    this.error.set('');

    const { data, error } = await this.auth.client.startTotpEnrollment();

    if (error) {
      this.error.set(
        totpErrorMessage(
          error,
          'Could not start authenticator app setup. Please try again.'
        )
      );
      this.status.set('start_failed');
      return;
    }

    this.enrollment.set(data);
    this.status.set('ready');
  }

  async copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      this.copyMessage.set('Setup key copied.');
    } catch {
      this.copyMessage.set(
        'Could not copy the setup key. Select it and copy it instead.'
      );
    }
  }

  async verify(event: Event) {
    event.preventDefault();
    if (this.status() !== 'ready') return;

    const code = this.code().replace(/\s+/g, '');
    if (!new RegExp(`^\\d{${TOTP_CODE_LENGTH}}$`).test(code)) {
      this.error.set(
        `Enter the ${TOTP_CODE_LENGTH}-digit code from your authenticator app.`
      );
      return;
    }

    this.error.set('');
    this.status.set('verifying');

    const { error } = await this.auth.client.verifyTotpEnrollment(code);

    if (error) {
      this.error.set(totpErrorMessage(error, 'Could not verify that code.'));
      this.code.set('');
      this.status.set('ready');
      return;
    }

    // Picks up the lifted recovery restriction, which the client has already
    // rotated the token for.
    await this.auth.refreshSession({ background: true });
    this.enrolled.emit();
  }
}
