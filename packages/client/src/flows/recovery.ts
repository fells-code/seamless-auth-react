/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type {
  RecoveryCodesResult,
  SeamlessAuthClient,
  StepUpStatus,
} from '../client/createSeamlessAuthClient';
import {
  getRecoveryErrorCode,
  isStepUpRequired,
  type RecoveryErrorCode,
} from '../client/errors';
import type { SeamlessAuthResult } from '../client/result';
import type { Credential } from '../types';

/** Which recovery paths this instance offers on its sign-in screen. */
export interface RecoveryOptions {
  recoveryCodes: boolean;
  accountRecovery: boolean;
}

/**
 * Read from the public configuration, so a sign-in screen offers a path only where
 * it works. Both stay off when the answer is missing or the request fails.
 */
export async function loadRecoveryOptions(
  client: Pick<SeamlessAuthClient, 'getPublicSystemConfig'>
): Promise<RecoveryOptions> {
  try {
    const { data, error } = await client.getPublicSystemConfig();

    return {
      recoveryCodes: !error && data?.recoveryCodes === true,
      accountRecovery: !error && data?.accountRecovery === true,
    };
  } catch {
    return { recoveryCodes: false, accountRecovery: false };
  }
}

export const RECOVERY_ERROR_MESSAGES: Record<RecoveryErrorCode, string> = {
  invalid_recovery_code:
    'That code is not valid. Check it and try again. Each recovery code works once.',
  recovery_codes_disabled: 'Recovery codes are turned off for this application.',
  account_recovery_disabled: 'Account recovery is turned off for this application.',
  recovery_notice_failed:
    'Recovery was not started because we could not notify you at the addresses on your account. Try again later.',
  recovery_not_found:
    'There is no open recovery request for this sign-in. Start recovery again.',
  recovery_not_ready:
    'This recovery request is still waiting. Come back once the waiting period ends.',
  cancel_token_required:
    'This cancel link is incomplete. Open the link from the notice again.',
  enrollment_required: 'Add a new passkey to finish recovering your account.',
};

export const RECOVERY_GENERIC_ERROR = 'Something went wrong. Please try again.';

/** What to tell someone whose recovery step failed. */
export function recoveryErrorMessage(
  error: unknown,
  fallback: string = RECOVERY_GENERIC_ERROR
): string {
  const code = getRecoveryErrorCode(error);

  return code ? RECOVERY_ERROR_MESSAGES[code] : fallback;
}

/**
 * The cancel token from a recovery notice's link, which carries it in the fragment
 * (`/recovery/cancel#<token>`) so it never reaches a server log.
 */
export function recoveryCancelTokenFromHash(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;

  let token: string;
  try {
    token = decodeURIComponent(raw).trim();
  } catch {
    return null;
  }

  return token === '' ? null : token;
}

export type RecoveryCancelOutcome =
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

/**
 * Posts the token from a notice. The API answers the same whether or not it
 * matched an open request, so a success says only that nothing is left to cancel.
 */
export async function cancelRecoveryFromLink(
  client: Pick<SeamlessAuthClient, 'cancelAccountRecovery'>,
  token: string | null
): Promise<RecoveryCancelOutcome> {
  if (!token) {
    return { kind: 'error', message: RECOVERY_ERROR_MESSAGES.cancel_token_required };
  }

  const { error } = await client.cancelAccountRecovery(token);

  if (error) {
    return {
      kind: 'error',
      message: recoveryErrorMessage(
        error,
        'We could not cancel the recovery request. Try the link again.'
      ),
    };
  }

  return { kind: 'cancelled' };
}

export type RecoveryCodesOutcome =
  | { kind: 'generated'; codes: RecoveryCodesResult }
  | { kind: 'error'; message: string };

/**
 * Generates a new set, stepping up first when the API asks for it. A first set
 * needs only the session; replacing one needs a fresh step-up.
 */
export async function generateRecoveryCodesWithStepUp(deps: {
  client: Pick<SeamlessAuthClient, 'generateRecoveryCodes'>;
  verifyStepUp: () => Promise<SeamlessAuthResult<StepUpStatus>>;
}): Promise<RecoveryCodesOutcome> {
  const first = await deps.client.generateRecoveryCodes();

  if (!first.error) {
    return { kind: 'generated', codes: first.data };
  }

  if (!isStepUpRequired(first.error)) {
    return {
      kind: 'error',
      message: recoveryErrorMessage(first.error, 'Failed to generate recovery codes.'),
    };
  }

  const stepUp = await deps.verifyStepUp();

  if (stepUp.error) {
    return {
      kind: 'error',
      message: 'Confirm it is you to replace your recovery codes.',
    };
  }

  const retried = await deps.client.generateRecoveryCodes();

  return retried.error
    ? {
        kind: 'error',
        message: recoveryErrorMessage(
          retried.error,
          'Failed to generate recovery codes.'
        ),
      }
    : { kind: 'generated', codes: retried.data };
}

/** The codes as a plain text file's contents, one per line. */
export function recoveryCodesText(codes: string[], appName = 'your account'): string {
  return [`Recovery codes for ${appName}. Each code works once.`, '', ...codes, ''].join(
    '\n'
  );
}

/** The kind of authenticator a passkey is, for a management screen. */
export type PasskeyKind = 'security_key' | 'synced' | 'device_bound';

export function passkeyKind(credential: Credential): PasskeyKind {
  if (credential.transports?.some(t => t === 'usb' || t === 'nfc' || t === 'ble')) {
    return 'security_key';
  }

  return credential.deviceType === 'multiDevice' || credential.backedUp
    ? 'synced'
    : 'device_bound';
}

export const PASSKEY_KIND_LABELS: Record<PasskeyKind, string> = {
  security_key: 'Security key',
  synced: 'Synced passkey',
  device_bound: 'Device passkey',
};

/** The name to show for a passkey, falling back to where it was enrolled. */
export function passkeyDisplayName(credential: Credential): string {
  return credential.friendlyName || credential.deviceInfo || 'Passkey';
}
