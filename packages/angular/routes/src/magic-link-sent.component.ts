/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { SeamlessAuth } from '@seamless-auth/angular';
import {
  MAGIC_LINK_RESEND_COOLDOWN_SECONDS,
  watchMagicLink,
} from '@seamless-auth/client';

import { SaAuthLayout } from './auth-layout.component';
import { injectAuthNavigation } from './navigation';
import { authRoutePaths } from './paths';

/**
 * Waits for an emailed link to be used, then signs this tab in. A link opened
 * in another tab of this browser reports back at once; one opened on another
 * device is picked up by polling.
 */
@Component({
  selector: 'sa-magic-link-sent',
  imports: [SaAuthLayout],
  template: `
    <sa-auth-layout>
      <div class="sa-center">
        <h2 class="sa-heading">Check your email</h2>
        <p class="sa-description">
          If an account exists for this address, we sent a secure sign-in link.
        </p>
        @if (identifier) {
          <div class="sa-identifier">{{ identifier }}</div>
        }
        <p class="sa-helper-text">
          Open the email and click the link to finish signing in.
        </p>
        <p class="sa-helper-text">
          Didn't receive anything? Check your spam folder or try creating a new account.
        </p>
      </div>

      <div class="sa-actions">
        <button
          type="button"
          class="sa-secondary"
          [disabled]="cooldown() > 0"
          (click)="resend()"
        >
          Resend link
        </button>
        @if (cooldown() > 0) {
          <div class="sa-helper-text sa-center">Available in {{ cooldown() }}s</div>
        }
        <button type="button" class="sa-link" (click)="changeIdentifier()">
          Change email or phone
        </button>
      </div>
    </sa-auth-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaMagicLinkSent {
  private readonly auth = inject(SeamlessAuth);
  private readonly navigation = injectAuthNavigation();

  readonly identifier = this.navigation.state<{ identifier: string }>().identifier;
  readonly cooldown = signal(MAGIC_LINK_RESEND_COOLDOWN_SECONDS);

  constructor() {
    const timer = setInterval(() => {
      this.cooldown.update(seconds => Math.max(0, seconds - 1));
    }, 1000);

    const stop = watchMagicLink({
      client: this.auth.client,
      refreshSession: this.auth.refreshSession,
      onSignedIn: () => void this.navigation.toApp(),
    });

    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      stop();
    });
  }

  async resend() {
    if (this.cooldown() > 0) return;
    await this.auth.client.requestMagicLink();
    this.cooldown.set(MAGIC_LINK_RESEND_COOLDOWN_SECONDS);
  }

  changeIdentifier() {
    void this.navigation.toScreen(authRoutePaths.login);
  }
}
