/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

// Browsers strip tabs and newlines from a URL before resolving it, so a control
// character can hide `//host` inside what looks like a path (`/\t/host`).
// eslint-disable-next-line no-control-regex -- control characters are the point
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * Whether a path stays in this application when a browser or router resolves
 * it. `//host` and `/\host` are protocol-relative to a browser.
 */
function isInAppPath(path: string): boolean {
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.startsWith('/\\') &&
    !CONTROL_CHARACTERS.test(path)
  );
}

/**
 * A destination handed over through navigation state, or `/`.
 *
 * Only an in-app path is honoured, so state cannot become an off-site redirect.
 */
export function safeReturnPath(value: unknown): string {
  return typeof value === 'string' && isInAppPath(value) ? value : '/';
}

/**
 * The in-app path a `returnTo` names, or null.
 *
 * The auth server validated the destination against its configured origins
 * before signing it into the OAuth state, so this is not the guard against an
 * open redirect. It is a narrower question: a router can only move within this
 * application, so a destination on another origin is not somewhere the bundled
 * screens can send anyone. An adopter that wants to leave the app reads
 * `returnTo` off the client result and navigates itself.
 */
export function inAppPath(returnTo: string | undefined, origin: string): string | null {
  if (!returnTo) return null;

  try {
    const target = new URL(returnTo, origin);

    if (target.origin !== origin) return null;

    const path = `${target.pathname}${target.search}${target.hash}`;

    // A same-origin URL can still carry a path such as `//evil.example`, which an
    // older router hands to the browser as a protocol-relative URL.
    return isInAppPath(path) ? path : null;
  } catch {
    return null;
  }
}
