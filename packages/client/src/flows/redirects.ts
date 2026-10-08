/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

/**
 * A destination handed over through navigation state, or `/`.
 *
 * Only an in-app path is honoured, so state cannot become an off-site redirect:
 * `//host` and `/\host` are protocol-relative to a browser and are refused.
 */
export function safeReturnPath(value: unknown): string {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
    ? value
    : '/';
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

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}
