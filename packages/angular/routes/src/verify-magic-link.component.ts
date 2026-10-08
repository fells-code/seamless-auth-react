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
import { finishMagicLinkSignIn, type MagicLinkOutcome } from '@seamless-auth/client';

import { SaAuthLayout } from './auth-layout.component';
import { injectAuthNavigation } from './navigation';

/**
 * Where an emailed magic link lands. Verifies the link once, tells the tab that
 * asked for it, and signs this tab in too when the link was opened in the same
 * browser.
 */
@Component({
  selector: 'sa-verify-magic-link',
  imports: [SaAuthLayout],
  template: `
    <sa-auth-layout>
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
