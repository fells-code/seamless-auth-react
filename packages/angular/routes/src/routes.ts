/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { Routes } from '@angular/router';

import { SaLogin } from './login.component';
import { SaMagicLinkSent } from './magic-link-sent.component';
import { SaOAuthCallback } from './oauth-callback.component';
import { SaPasskeyLogin } from './passkey-login.component';
import { authRoutePaths } from './paths';
import { SaRegisterPasskey } from './register-passkey.component';
import { SaVerifyMagicLink } from './verify-magic-link.component';
import { SaVerifyOtp } from './verify-otp.component';

/**
 * The bundled sign-in screens. Mount them where the application wants them,
 * for example at the root next to its own routes, or lazily:
 *
 * ```ts
 * { path: '', loadChildren: () => import('@seamless-auth/angular/routes').then(m => m.seamlessAuthRoutes) }
 * ```
 *
 * There is no wildcard here, so mounting at the root does not swallow the
 * application's own unknown paths.
 */
export const seamlessAuthRoutes: Routes = [
  { path: authRoutePaths.login, component: SaLogin },
  { path: authRoutePaths.passkeyLogin, component: SaPasskeyLogin },
  {
    path: authRoutePaths.verifyEmailOtp,
    component: SaVerifyOtp,
    data: { channel: 'email' },
  },
  {
    path: authRoutePaths.verifyPhoneOtp,
    component: SaVerifyOtp,
    data: { channel: 'phone' },
  },
  { path: authRoutePaths.magicLinkSent, component: SaMagicLinkSent },
  { path: authRoutePaths.verifyMagicLink, component: SaVerifyMagicLink },
  { path: authRoutePaths.oauthCallback, component: SaOAuthCallback },
  { path: authRoutePaths.registerPasskey, component: SaRegisterPasskey },
];
