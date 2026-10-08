/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { SeamlessAuthClient } from '../client/createSeamlessAuthClient';
import type { AuthSessionActions } from '../session/createAuthSession';

export type OtpChannel = 'email' | 'phone';

/** `login` signs an existing user in; `register` verifies a new account. */
export type OtpFlow = 'login' | 'register';

export const OTP_LENGTH = 6;

/** Seconds a sent code stays valid, which the screens count down from. */
export const OTP_LIFETIME_SECONDS = 300;

/** Where the user goes once a code is accepted. */
export type OtpNextStep = 'home' | 'register_passkey' | 'verify_email';

type OtpClient = Pick<
  SeamlessAuthClient,
  | 'requestEmailOtp'
  | 'requestLoginEmailOtp'
  | 'requestPhoneOtp'
  | 'requestLoginPhoneOtp'
  | 'verifyEmailOtp'
  | 'verifyLoginEmailOtp'
  | 'verifyPhoneOtp'
  | 'verifyLoginPhoneOtp'
>;

/** Sends (or resends) a code over a channel. */
export function requestOtp(client: OtpClient, channel: OtpChannel, flow: OtpFlow) {
  if (channel === 'email') {
    return flow === 'login' ? client.requestLoginEmailOtp() : client.requestEmailOtp();
  }

  return flow === 'login' ? client.requestLoginPhoneOtp() : client.requestPhoneOtp();
}

export function otpResendFailedMessage(channel: OtpChannel): string {
  return channel === 'email'
    ? 'Failed to send Email code. If this persists, refresh the page and try again.'
    : 'Failed to send SMS code. If this persists, refresh the page and try again.';
}

/**
 * Verifies a code and decides what comes next.
 *
 * A login code signs the user in. A registration email code leads to passkey
 * enrolment where the device supports it, and a registration phone code leads
 * on to the email code, which this sends.
 */
export async function verifyOtp(
  deps: {
    client: OtpClient;
    refreshSession: AuthSessionActions['refreshSession'];
  },
  input: { channel: OtpChannel; flow: OtpFlow; code: string; passkeySupported?: boolean }
): Promise<{ next: OtpNextStep; error: null } | { next: null; error: string }> {
  const { client, refreshSession } = deps;
  const { channel, flow, code } = input;

  if (code.length !== OTP_LENGTH) {
    return { next: null, error: 'Please enter a valid code.' };
  }

  const verify =
    channel === 'email'
      ? flow === 'login'
        ? client.verifyLoginEmailOtp
        : client.verifyEmailOtp
      : flow === 'login'
        ? client.verifyLoginPhoneOtp
        : client.verifyPhoneOtp;

  const { error } = await verify(code);

  if (error) {
    return { next: null, error: 'Verification failed.' };
  }

  if (flow === 'login') {
    await refreshSession();
    return { next: 'home', error: null };
  }

  if (channel === 'phone') {
    const { error: sendError } = await client.requestEmailOtp();

    return sendError
      ? {
          next: null,
          error:
            'Failed to send Email code. If this persists, refresh the page and try registering again.',
        }
      : { next: 'verify_email', error: null };
  }

  if (input.passkeySupported) {
    return { next: 'register_passkey', error: null };
  }

  await refreshSession();
  return { next: 'home', error: null };
}

/** `mm:ss` for a countdown. */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const s = (safe % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export type OtpInputMode = 'numeric' | 'text';

/** Whether one character belongs in a code box. */
export function isOtpCharacter(char: string, mode: OtpInputMode): boolean {
  return mode === 'numeric' ? /^\d$/.test(char) : /^[a-zA-Z]$/.test(char);
}

/** The characters of a pasted or typed string that belong in a code. */
export function otpCharacters(input: string, mode: OtpInputMode): string[] {
  const cleaned =
    mode === 'numeric' ? input.replace(/\D/g, '') : input.replace(/[^a-zA-Z]/g, '');

  return cleaned.split('');
}
