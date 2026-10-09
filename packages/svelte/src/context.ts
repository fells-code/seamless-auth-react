/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { getContext, setContext } from 'svelte';

import type { SeamlessAuth } from './auth.svelte.js';
import type { AuthNavigator } from './navigation.js';

const AUTH_KEY = Symbol('seamless-auth');
const NAVIGATOR_KEY = Symbol('seamless-auth-navigator');

/**
 * Makes the session available to the components below, the bundled screens
 * included. Call it while a root component (a SvelteKit `+layout.svelte`, or
 * `App.svelte`) initialises.
 */
export function setSeamlessAuth(auth: SeamlessAuth): SeamlessAuth {
  return setContext(AUTH_KEY, auth);
}

/** The session set by `setSeamlessAuth`. Call it while a component initialises. */
export function getSeamlessAuth(): SeamlessAuth {
  const auth = getContext<SeamlessAuth | undefined>(AUTH_KEY);

  if (!auth) {
    throw new Error(
      'Seamless Auth is not set. Call setSeamlessAuth(createSeamlessAuth({ apiHost })) in a root component.'
    );
  }

  return auth;
}

/** Tells the bundled screens how to navigate. See `AuthNavigator`. */
export function setAuthNavigator(navigator: AuthNavigator): AuthNavigator {
  return setContext(NAVIGATOR_KEY, navigator);
}

export function getAuthNavigator(): AuthNavigator {
  const navigator = getContext<AuthNavigator | undefined>(NAVIGATOR_KEY);

  if (!navigator) {
    throw new Error(
      'The Seamless Auth screens need a navigator. In SvelteKit, call setAuthNavigator(createKitNavigator(auth)) in your root layout.'
    );
  }

  return navigator;
}
