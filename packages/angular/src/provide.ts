/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  type EnvironmentProviders,
} from '@angular/core';

import { SEAMLESS_AUTH_CONFIG, type SeamlessAuthConfig } from './config';
import { SeamlessAuth } from './seamless-auth.service';

/**
 * Configures Seamless Auth for an application:
 *
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [provideRouter(routes), provideSeamlessAuth({ apiHost: 'https://app.example.com' })],
 * });
 * ```
 *
 * Pass a factory instead of an object to read configuration at runtime. It runs
 * in an injection context, so it can `inject()` what it needs.
 *
 * The session is read as soon as the application starts in the browser.
 */
export function provideSeamlessAuth(
  config: SeamlessAuthConfig | (() => SeamlessAuthConfig)
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SEAMLESS_AUTH_CONFIG,
      useFactory: typeof config === 'function' ? config : () => config,
    },
    provideEnvironmentInitializer(() => {
      inject(SeamlessAuth);
    }),
  ]);
}
