/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { SEAMLESS_AUTH_CONFIG } from './config';

function originOf(url: string, base: string | undefined): string | null {
  try {
    return new URL(url, base).origin;
  } catch {
    return null;
  }
}

/**
 * Sends the session cookies with `HttpClient` requests to the configured
 * `apiHost` and `trustedOrigins`, and only to them, so a request to any other
 * origin never carries them:
 *
 * ```ts
 * provideHttpClient(withInterceptors([seamlessAuthInterceptor]))
 * ```
 *
 * The adapter's own `/auth` routes are called by the session, not through
 * `HttpClient`, and need nothing from this.
 */
export const seamlessAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const { apiHost, trustedOrigins = [] } = inject(SEAMLESS_AUTH_CONFIG);
  const base = typeof location === 'undefined' ? undefined : location.href;
  const target = originOf(request.url, base);
  const trusted = [apiHost, ...trustedOrigins].map(origin => originOf(origin, base));

  if (target !== null && trusted.includes(target)) {
    return next(request.clone({ withCredentials: true }));
  }

  return next(request);
};
