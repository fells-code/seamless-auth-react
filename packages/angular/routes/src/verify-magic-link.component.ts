/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeamlessAuth } from '@seamless-auth/angular';
import {
  confirmMagicLinkSignIn,
  finishMagicLinkSignIn,
  getMagicLinkConfirmation,
  magicLinkConfirmationPrompt,
  type MagicLinkOutcome,
} from '@seamless-auth/client';

import { SaAuthLayout } from './auth-layout.component';
import { injectAuthNavigation } from './navigation';

/**
 * Where an emailed magic link lands. Verifies the link once, tells the tab that
 * asked for it, and signs this tab in too when the link was opened in the same
 * browser. Opened on another device, the link is held and the screen asks
 * whether to sign the requesting device in.
 */
@Component({
  selector: 'sa-verify-magic-link',
  imports: [SaAuthLayout],
  template: `
    <sa-auth-layout>
      @if (prompt()) {
        <div class="sa-center">
          <h1 class="sa-heading">Confirm this sign-in</h1>

          @if (decision() === 'pending' || decision() === 'confirming') {
            <p class="sa-description">{{ prompt() }}</p>
            <p class="sa-helper-text">
              This link was opened on a different device from the one that asked for it.
              Only continue if you made that request.
            </p>
          }
          @if (decision() === 'confirmed') {
            <p class="sa-success" role="status">
              Sign-in approved. You can return to your other device to continue.
            </p>
          }
          @if (decision() === 'declined') {
            <p class="sa-helper-text" role="status">
              No one has been signed in. You can ignore the email and close this page.
            </p>
          }
        </div>

        @if (decision() === 'pending' || decision() === 'confirming') {
          <div class="sa-actions">
            <button
              type="button"
              class="sa-button"
              [disabled]="decision() === 'confirming'"
              (click)="confirm()"
            >
              Yes, sign in that device
            </button>
            <button
              type="button"
              class="sa-secondary"
              [disabled]="decision() === 'confirming'"
              (click)="decision.set('declined')"
            >
              No, this wasn't me
            </button>
          </div>
          @if (confirmError()) {
            <p class="sa-error" role="alert">{{ confirmError() }}</p>
          }
        }
      } @else {
        <div class="sa-center">
          <h1 class="sa-heading">Verifying your login</h1>

          @if (!outcome() && !error()) {
            <div class="sa-spinner" aria-hidden="true"></div>
            <p class="sa-helper-text">
              Please wait while we securely verify your sign-in link.
            </p>
          }
          @if (outcome() === 'signed-in') {
            <p class="sa-success" role="status">Login verified. Redirecting...</p>
          }
          @if (outcome() === 'elsewhere') {
            <p class="sa-success" role="status">
              Login verified. Return to the device where you requested this link to
              continue.
            </p>
          }
          @if (error()) {
            <p class="sa-error" role="alert">{{ error() }}</p>
          }
        </div>
      }
    </sa-auth-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaVerifyMagicLink {
  private readonly auth = inject(SeamlessAuth);
  private readonly navigation = injectAuthNavigation();
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  readonly outcome = signal<MagicLinkOutcome | null>(null);
  readonly error = signal('');
  readonly prompt = signal('');
  readonly decision = signal<'pending' | 'confirming' | 'confirmed' | 'declined'>(
    'pending'
  );
  readonly confirmError = signal('');

  async confirm() {
    if (!this.token || this.decision() === 'confirming') return;

    this.decision.set('confirming');
    this.confirmError.set('');

    const { error } = await confirmMagicLinkSignIn({
      client: this.auth.client,
      token: this.token,
    });

    if (error) {
      this.decision.set('pending');
      this.confirmError.set(
        'We could not confirm this sign-in. The link may have expired or already been used.'
      );
      return;
    }

    this.decision.set('confirmed');
  }

  constructor() {
    let active = true;
    let redirect: ReturnType<typeof setTimeout> | undefined;

    inject(DestroyRef).onDestroy(() => {
      active = false;
      clearTimeout(redirect);
    });

    // Browser only. A server render would spend the single-use link in a request
    // that carries none of this browser's cookies, and the browser would then
    // find it used.
    afterNextRender(async () => {
      if (!this.token) {
        this.error.set('Missing token for verification.');
        return;
      }

      // The token is read; keep it out of history and Referers from here on.
      void this.navigation.dropQuery();

      // A link can be used once. The component verifies exactly once per
      // instance, and Angular does not mount a route component twice.
      const { error } = await this.auth.client.verifyMagicLink(this.token);

      if (!active) return;

      if (error) {
        const held = getMagicLinkConfirmation(error);
        if (held) {
          this.prompt.set(magicLinkConfirmationPrompt(held));
          return;
        }

        this.error.set('Failed to verify token');
        return;
      }

      const outcome = await finishMagicLinkSignIn({
        client: this.auth.client,
        refreshSession: this.auth.refreshSession,
      });

      if (!active) return;

      this.outcome.set(outcome);

      if (outcome === 'signed-in') {
        redirect = setTimeout(() => void this.navigation.toApp(), 900);
      }
    });
  }
}
