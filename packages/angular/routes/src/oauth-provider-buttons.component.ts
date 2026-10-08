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
  input,
  signal,
} from '@angular/core';
import { SeamlessAuth } from '@seamless-auth/angular';
import { startOAuthSignIn, type OAuthProvider } from '@seamless-auth/client';

import { injectAuthNavigation } from './navigation';
import { authRoutePaths } from './paths';

/** A button per OAuth provider the instance has enabled. Renders nothing without one. */
@Component({
  selector: 'sa-oauth-provider-buttons',
  template: `
    @if (providers().length > 0) {
      <div class="sa-actions">
        @for (provider of providers(); track provider.id) {
          <button type="button" class="sa-action" (click)="select(provider.id)">
            <span class="sa-action-title">Continue with {{ provider.name }}</span>
          </button>
        }
        @if (error()) {
          <p class="sa-error">{{ error() }}</p>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaOAuthProviderButtons {
  private readonly auth = inject(SeamlessAuth);
  private readonly navigation = injectAuthNavigation();

  /**
   * The redirect URI to register with providers. Defaults to the bundled
   * callback screen beside the screen this renders in.
   */
  readonly redirectUri = input<string>();

  readonly providers = signal<OAuthProvider[]>([]);
  readonly error = signal('');

  constructor() {
    afterNextRender(() => {
      void this.auth.listOAuthProviders().then(({ data }) => {
        this.providers.set(data?.providers ?? []);
      });
    });
  }

  async select(providerId: string) {
    this.error.set('');

    const { error } = await startOAuthSignIn(
      { actions: this.auth, oauthRedirect: this.auth.ports.oauthRedirect },
      {
        providerId,
        redirectUri:
          this.redirectUri() ?? this.navigation.absoluteUrl(authRoutePaths.oauthCallback),
      }
    );

    if (error) {
      this.error.set(error);
    }
  }
}
