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
import { ActivatedRoute } from '@angular/router';
import { SeamlessAuth } from '@seamless-auth/angular';
import { completeOAuthCallback } from '@seamless-auth/client';

import { SaAuthLayout } from './auth-layout.component';
import { injectAuthNavigation } from './navigation';
import { authRoutePaths } from './paths';

/** The OAuth redirect URI. Finishes a provider sign-in. */
@Component({
  selector: 'sa-oauth-callback',
  imports: [SaAuthLayout],
  template: `
    <sa-auth-layout [card]="false">
      <h2 class="sa-heading">
        {{ error() ? 'Sign-in failed' : 'Completing sign-in...' }}
      </h2>
      @if (error()) {
        <p>{{ error() }}</p>
        <button type="button" class="sa-link" (click)="backToLogin()">
          Back to login
        </button>
      }
    </sa-auth-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaOAuthCallback {
  private readonly auth = inject(SeamlessAuth);
  private readonly navigation = injectAuthNavigation();

  readonly error = signal('');

  constructor() {
    const params = inject(ActivatedRoute).snapshot.queryParamMap;

    // Browser only: the code is single use, and a server render has neither the
    // browser's cookies nor a window.
    afterNextRender(async () => {
      // The code and state are read; keep them out of history and Referers.
      void this.navigation.dropQuery();

      const outcome = await completeOAuthCallback(
        this.auth,
        params,
        window.location.origin
      );

      if (outcome.kind === 'error') {
        this.error.set(outcome.message);
        return;
      }

      if (outcome.kind === 'enroll_passkey') {
        void this.navigation.toScreen(authRoutePaths.registerPasskey, {
          returnTo: outcome.returnTo,
        });
        return;
      }

      void this.navigation.toApp(outcome.destination);
    });
  }

  backToLogin() {
    void this.navigation.toScreen(authRoutePaths.login);
  }
}
