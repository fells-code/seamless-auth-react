/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import { SaLogin } from './components/Login';
import { SaMagicLinkSent } from './components/MagicLinkSent';
import { SaOAuthCallback } from './components/OAuthCallback';
import { SaPasskeyLogin } from './components/PasskeyLogin';
import { SaRegisterPasskey } from './components/RegisterPasskey';
import { SaVerifyMagicLink } from './components/VerifyMagicLink';
import { SaVerifyOtp } from './components/VerifyOtp';
import { authRouteName, authRoutePaths, type AuthScreen } from './paths';

export interface SeamlessAuthRoutesOptions {
  /** The path the screens are mounted under. Defaults to `/`. */
  basePath?: string;
}

/**
 * The bundled sign-in screens as named routes, to spread into the router's
 * routes. There is no catch-all among them, so they never swallow the
 * application's own unknown paths:
 *
 * ```ts
 * createRouter({ history: createWebHistory(), routes: [...appRoutes, ...createSeamlessAuthRoutes()] })
 * ```
 */
export function createSeamlessAuthRoutes(
  options: SeamlessAuthRoutesOptions = {}
): RouteRecordRaw[] {
  const base = `/${(options.basePath ?? '/').replace(/^\/+|\/+$/g, '')}`;
  const pathOf = (screen: AuthScreen) =>
    `${base === '/' ? '' : base}/${authRoutePaths[screen]}`;
  const route = (
    screen: AuthScreen,
    component: Component,
    props?: Record<string, string>
  ): RouteRecordRaw => ({
    path: pathOf(screen),
    name: authRouteName(screen),
    component,
    ...(props ? { props } : {}),
  });

  return [
    route('login', SaLogin),
    route('passkeyLogin', SaPasskeyLogin),
    route('verifyEmailOtp', SaVerifyOtp, { channel: 'email' }),
    route('verifyPhoneOtp', SaVerifyOtp, { channel: 'phone' }),
    route('magicLinkSent', SaMagicLinkSent),
    route('verifyMagicLink', SaVerifyMagicLink),
    route('oauthCallback', SaOAuthCallback),
    route('registerPasskey', SaRegisterPasskey),
  ];
}
