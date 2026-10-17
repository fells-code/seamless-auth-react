/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type {
  MessageResult,
  SeamlessAuthClient,
} from '../client/createSeamlessAuthClient';
import { SeamlessAuthError } from '../client/errors';
import type { SeamlessAuthResult } from '../client/result';
import type { AuthSessionActions } from '../session/createAuthSession';

/** The channel a verified link uses to tell the tab that asked for it. */
export const MAGIC_LINK_CHANNEL = 'seamless-auth';
export const MAGIC_LINK_SUCCESS_MESSAGE = 'MAGIC_LINK_AUTH_SUCCESS';
export const MAGIC_LINK_POLL_INTERVAL_MS = 5000;
export const MAGIC_LINK_RESEND_COOLDOWN_SECONDS = 30;

type MagicLinkDeps = {
  client: Pick<SeamlessAuthClient, 'checkMagicLink'>;
  refreshSession: AuthSessionActions['refreshSession'];
};

/**
 * Whether the emailed link has been used. The poll endpoint answers 204 while
 * the link is still unused, and only reports Success once it has been consumed.
 * A bare ok check would treat that 204 as completion and redirect before the
 * user clicks the link.
 */
export async function isMagicLinkComplete(
  client: Pick<SeamlessAuthClient, 'checkMagicLink'>
): Promise<boolean> {
  const { data, error } = await client.checkMagicLink();

  return !error && data?.message === 'Success';
}

/**
 * Watches for the link to be used, from the tab that asked for it: a message
 * from a tab in this browser that verified it, or a poll for one opened on
 * another device. Calls `onSignedIn` once, after the session is refreshed.
 * Returns a function that stops watching.
 */
export function watchMagicLink(
  deps: MagicLinkDeps & {
    onSignedIn: () => void;
    pollIntervalMs?: number;
  }
): () => void {
  let stopped = false;

  const complete = async () => {
    if (stopped || !(await isMagicLinkComplete(deps.client)) || stopped) {
      return;
    }

    stopped = true;
    await deps.refreshSession();
    deps.onSignedIn();
  };

  const channel =
    typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel(MAGIC_LINK_CHANNEL);

  if (channel) {
    channel.onmessage = event => {
      if (event.data?.type === MAGIC_LINK_SUCCESS_MESSAGE) {
        void complete().catch(() => undefined);
      }
    };
  }

  const interval = setInterval(() => {
    // A rejection inside a timer has no caller to surface it, so the poll
    // swallows unexpected errors and simply tries again on the next tick.
    void complete().catch(() => undefined);
  }, deps.pollIntervalMs ?? MAGIC_LINK_POLL_INTERVAL_MS);

  return () => {
    stopped = true;
    clearInterval(interval);
    channel?.close();
  };
}

export type MagicLinkOutcome = 'signed-in' | 'elsewhere';

/** The platform family of the device that asked for a link. */
export type MagicLinkDeviceClass =
  | 'ios'
  | 'android'
  | 'macos'
  | 'windows'
  | 'linux'
  | 'chromeos'
  | 'bot'
  | 'unknown';

/** Who asked for a link that was opened on another device. */
export interface MagicLinkConfirmation {
  deviceClass: MagicLinkDeviceClass;
  /** ISO 8601 timestamp of the request. */
  requestedAt: string;
}

const DEVICE_LABELS: Record<MagicLinkDeviceClass, string> = {
  ios: 'an iPhone or iPad',
  android: 'an Android device',
  macos: 'a Mac',
  windows: 'a Windows PC',
  linux: 'a Linux computer',
  chromeos: 'a Chromebook',
  bot: 'an automated client',
  unknown: 'an unknown device',
};

function readConfirmation(body: unknown): MagicLinkConfirmation | undefined {
  if (typeof body !== 'object' || body === null) return undefined;

  const { error, requestedFrom } = body as { error?: unknown; requestedFrom?: unknown };
  if (error !== 'confirmation_required') return undefined;

  const from = (
    typeof requestedFrom === 'object' && requestedFrom !== null ? requestedFrom : {}
  ) as { deviceClass?: unknown; requestedAt?: unknown };

  return {
    deviceClass:
      typeof from.deviceClass === 'string' &&
      Object.prototype.hasOwnProperty.call(DEVICE_LABELS, from.deviceClass)
        ? (from.deviceClass as MagicLinkDeviceClass)
        : 'unknown',
    requestedAt: typeof from.requestedAt === 'string' ? from.requestedAt : '',
  };
}

/**
 * Read a `verifyMagicLink()` failure that means the link was opened on a
 * device other than the one that asked for it. The link is still unused and
 * waits for `confirmMagicLink()`. Returns `undefined` for every other failure.
 *
 * As with the OAuth codes, a body a proxy nested under `details` is accepted.
 */
export function getMagicLinkConfirmation(
  error: unknown
): MagicLinkConfirmation | undefined {
  if (!(error instanceof SeamlessAuthError) || error.status !== 409) {
    return undefined;
  }

  return (
    readConfirmation(error.body) ??
    readConfirmation((error.body as { details?: unknown } | null)?.details)
  );
}

export function isMagicLinkConfirmationRequired(error: unknown): boolean {
  return getMagicLinkConfirmation(error) !== undefined;
}

/** A device class as a phrase, for example `a Mac`. */
export function describeMagicLinkDevice(deviceClass: MagicLinkDeviceClass): string {
  return DEVICE_LABELS[deviceClass] ?? DEVICE_LABELS.unknown;
}

/**
 * The sentence the bundled screens show above the confirmation buttons, with
 * the request time in the reader's locale. The time is left out when the API
 * sent one that does not parse.
 */
export function magicLinkConfirmationPrompt(
  confirmation: MagicLinkConfirmation,
  locales?: Intl.LocalesArgument
): string {
  const device = describeMagicLinkDevice(confirmation.deviceClass);
  const requestedAt = new Date(confirmation.requestedAt);

  if (!confirmation.requestedAt || Number.isNaN(requestedAt.getTime())) {
    return `A sign-in was requested from ${device}.`;
  }

  const when = requestedAt.toLocaleString(locales, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `A sign-in was requested from ${device} on ${when}.`;
}

/**
 * Approve a link that `verifyMagicLink()` held for confirmation. The device
 * that asked for it is signed in through its own poll; this one is not, so on
 * success a screen tells the reader to go back to it.
 */
export async function confirmMagicLinkSignIn(deps: {
  client: Pick<SeamlessAuthClient, 'confirmMagicLink'>;
  token: string;
}): Promise<SeamlessAuthResult<MessageResult>> {
  const result = await deps.client.confirmMagicLink(deps.token);

  // The requesting tab may be in this browser after all (a changed network
  // address is enough to miss the device match), and is then told at once.
  if (!result.error && typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(MAGIC_LINK_CHANNEL);
    channel.postMessage({ type: MAGIC_LINK_SUCCESS_MESSAGE });
    channel.close();
  }

  return result;
}

/**
 * What the screen an emailed link lands on does once the link is verified.
 *
 * Verifying the link does not sign in this tab. The session belongs to the
 * browser that asked for the link, which collects it from `/magic-link/check`
 * with its pre-auth cookie. So this tells that tab, then signs in here too when
 * it can: when the link was opened in the same browser, which holds the same
 * pre-auth cookie. Opened on another device there is nothing to collect, and
 * the outcome is `elsewhere`.
 *
 * Call it only after `verifyMagicLink()` succeeds. When the link was opened on
 * a device other than the one that asked for it, verification fails with an
 * error `getMagicLinkConfirmation()` recognises instead, and the flow continues
 * with `confirmMagicLinkSignIn()`.
 *
 * A link can be used once, so verification itself stays with the caller, which
 * has to make sure a remounted screen reuses the first request rather than
 * sending another.
 */
export async function finishMagicLinkSignIn(
  deps: MagicLinkDeps
): Promise<MagicLinkOutcome> {
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(MAGIC_LINK_CHANNEL);
    channel.postMessage({ type: MAGIC_LINK_SUCCESS_MESSAGE });
    channel.close();
  }

  // Each successful check issues a session, so check only when this browser has
  // none yet: the requesting tab may already have collected it. In the
  // background, because an application that shows a loading screen while the
  // session is read would unmount the screen and verify again.
  let session = await deps.refreshSession({ background: true });

  if (session.error) {
    await deps.client.checkMagicLink();
    session = await deps.refreshSession({ background: true });
  }

  return session.error ? 'elsewhere' : 'signed-in';
}
