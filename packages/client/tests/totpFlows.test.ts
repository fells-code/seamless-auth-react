/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { SeamlessAuthError } from '../src/client/errors';
import { formatTotpSecret, signInWithTotp, totpErrorMessage } from '../src/flows';

const failure = (status: number, body?: unknown) =>
  new SeamlessAuthError('failed', status, body);

describe('totpErrorMessage', () => {
  it.each(['totp_verification_failed', 'totp_disable_failed'])(
    'asks for the current code when %s',
    error => {
      expect(totpErrorMessage(failure(401, { error }))).toBe(
        'That code did not work. Enter the current code from your authenticator app. Each code works once.'
      );
    }
  );

  it('says how long a lockout lasts', () => {
    expect(
      totpErrorMessage(failure(423, { error: 'account_locked', retryAfterSeconds: 61 }))
    ).toBe('Too many failed attempts. Try again in 2 minutes.');
    expect(
      totpErrorMessage(failure(423, { error: 'account_locked', retryAfterSeconds: 30 }))
    ).toBe('Too many failed attempts. Try again in 1 minute.');
    expect(totpErrorMessage(failure(423, { error: 'account_locked' }))).toBe(
      'Too many failed attempts. Try again later.'
    );
  });

  it('covers rate limits, passkey-only accounts and a missing server key', () => {
    expect(totpErrorMessage(failure(429))).toMatch(/Wait a moment/);
    expect(totpErrorMessage(failure(403, { error: 'login_method_disabled' }))).toMatch(
      /passkey/
    );
    expect(totpErrorMessage(failure(409, { error: 'secret_required' }))).toMatch(
      /not available/
    );
  });

  it('falls back for anything else', () => {
    expect(totpErrorMessage(failure(500), 'Nope.')).toBe('Nope.');
    expect(totpErrorMessage(new Error('boom'))).toBe(
      'Something went wrong. Please try again.'
    );
  });
});

describe('formatTotpSecret', () => {
  it('groups the secret in fours', () => {
    expect(formatTotpSecret('JBSWY3DPEHPK3PXPJB')).toBe('JBSW Y3DP EHPK 3PXP JB');
    expect(formatTotpSecret(' JBSW Y3DP ')).toBe('JBSW Y3DP');
    expect(formatTotpSecret('')).toBe('');
  });
});

describe('signInWithTotp', () => {
  const setup = (result: { data: unknown; error: SeamlessAuthError | null }) => {
    const client = { verifyTotpLogin: jest.fn().mockResolvedValue(result) };
    const refreshSession = jest.fn().mockResolvedValue(undefined);
    return { client, refreshSession };
  };

  it('verifies the code and refreshes the session', async () => {
    const deps = setup({ data: { message: 'Success' }, error: null });

    await expect(signInWithTotp(deps, '123 456')).resolves.toEqual({ error: null });
    expect(deps.client.verifyTotpLogin).toHaveBeenCalledWith('123456');
    expect(deps.refreshSession).toHaveBeenCalled();
  });

  it('refuses a malformed code without calling the API', async () => {
    const deps = setup({ data: null, error: null });

    await expect(signInWithTotp(deps, '12a456')).resolves.toEqual({
      error: 'Enter the 6-digit code from your authenticator app.',
    });
    expect(deps.client.verifyTotpLogin).not.toHaveBeenCalled();
  });

  it('explains a refused code and stays signed out', async () => {
    const deps = setup({
      data: null,
      error: failure(401, { error: 'totp_verification_failed' }),
    });

    await expect(signInWithTotp(deps, '123456')).resolves.toEqual({
      error:
        'That code did not work. Enter the current code from your authenticator app. Each code works once.',
    });
    expect(deps.refreshSession).not.toHaveBeenCalled();
  });

  it('uses the sign-in fallback for an unknown failure', async () => {
    const deps = setup({ data: null, error: failure(500) });

    await expect(signInWithTotp(deps, '123456')).resolves.toEqual({
      error: 'We could not sign you in with that code.',
    });
  });
});
