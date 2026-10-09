/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { invalidate } from '$app/navigation';

import type { SeamlessAuth } from '../auth.svelte.js';

/** What the guards register, so a change in the session runs them again. */
export const SESSION_DEPENDENCY = 'seamless-auth:session';

/**
 * Re-runs every `load` guard when who is signed in, or as which organization,
 * changes: a sign-out in another tab, an expired session, a switched
 * organization. Without it a layout's guard runs once and its child pages keep
 * rendering. Call it while a component initialises.
 */
export function invalidateOnSessionChange(auth: SeamlessAuth) {
  let first = true;

  $effect(() => {
    // Read for tracking: these are what a guard decides on.
    void auth.isAuthenticated;
    void auth.user;
    void auth.activeOrganization;

    if (first) {
      first = false;
      return;
    }

    void invalidate(SESSION_DEPENDENCY);
  });
}
