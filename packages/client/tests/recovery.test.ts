/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { startRegistration } from '@simplewebauthn/browser';

import { createSeamlessAuthClient } from '../src/client/createSeamlessAuthClient';
import {
  getRecoveryErrorCode,
  isEnrollmentRequired,
  isStepUpRequired,
  SeamlessAuthError,
} from '../src/client/errors';
import { createFetchTransport } from '../src/fetchWithAuth';
import {
  cancelRecoveryFromLink,
  generateRecoveryCodesWithStepUp,
  loadRecoveryOptions,
  passkeyDisplayName,
  passkeyKind,
  recoveryCancelTokenFromHash,
  recoveryCodesText,
  recoveryErrorMessage,
} from '../src/flows/recovery';
import { createAuthSession } from '../src/session/createAuthSession';
import { createMemoryStorage } from '../src/session/storage';
import type { Credential } from '../src/types';

jest.mock('../src/fetchWithAuth');
jest.mock('@simplewebauthn/browser', () => ({
  ...jest.requireActual('@simplewebauthn/browser'),
  startRegistration: jest.fn(),
}));

const mockFetch = jest.fn();
const mockRefresh = jest.fn();

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number, body: unknown) => ({
  ok: false,
  status,
  json: async () => body,
});

const recoverySession = {
  message: 'Success',
  token: 'access',
  refreshToken: 'refresh',
  sub: 'user-1',
  email: 'a@example.com',
  recovery: true,
  nextStep: 'enroll_passkey',
};

const buildClient = () =>
  createSeamlessAuthClient({ apiHost: 'https://api.example.com' });

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockRefresh.mockReset().mockResolvedValue(true);
  (createFetchTransport as jest.Mock).mockImplementation(() => ({
    fetch: mockFetch,
    authorizedFetch: jest.fn(),
    refresh: mockRefresh,
    mode: 'cookie',
    clearTokens: jest.fn(),
  }));
});

describe('recovery code requests', () => {
  it('reads the status and generates a set', async () => {
    const client = buildClient();
    mockFetch
      .mockResolvedValueOnce(
        ok({ enabled: true, remaining: 10, total: 10, createdAt: null })
      )
      .mockResolvedValueOnce(ok({ message: 'Success', codes: ['A'], createdAt: 'now' }));

    await expect(client.getRecoveryCodeStatus()).resolves.toMatchObject({
      data: { remaining: 10 },
    });
    await expect(client.generateRecoveryCodes()).resolves.toMatchObject({
      data: { codes: ['A'] },
    });

    expect(mockFetch).toHaveBeenNthCalledWith(1, '/recovery-codes', { method: 'GET' });
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/recovery-codes', {
      method: 'POST',
      body: '{}',
    });
  });

  it('surfaces the step-up refusal for replacing a set', async () => {
    mockFetch.mockResolvedValueOnce(
      fail(403, { error: 'step_up_required', fresh: false, method: null })
    );

    const { error } = await buildClient().generateRecoveryCodes();

    expect(isStepUpRequired(error)).toBe(true);
    expect(error?.status).toBe(403);
  });

  it('redeems a code into a recovery session without exposing its tokens', async () => {
    const client = buildClient();
    mockFetch.mockResolvedValueOnce(ok(recoverySession));

    const result = await client.redeemRecoveryCode('abcde-fghij');

    expect(mockFetch).toHaveBeenCalledWith('/recovery-codes/redeem', {
      method: 'POST',
      body: JSON.stringify({ code: 'abcde-fghij' }),
    });
    expect(result).toEqual({
      data: {
        message: 'Success',
        email: 'a@example.com',
        recovery: true,
        nextStep: 'enroll_passkey',
      },
      error: null,
    });
    expect(client.isRecoverySession()).toBe(true);
  });

  it('stays a normal session when the code is refused', async () => {
    const client = buildClient();
    mockFetch.mockResolvedValueOnce(fail(401, { error: 'invalid_recovery_code' }));

    const { error } = await client.redeemRecoveryCode('nope');

    expect(getRecoveryErrorCode(error)).toBe('invalid_recovery_code');
    expect(client.isRecoverySession()).toBe(false);
  });
});

describe('account recovery requests', () => {
  it('sends each step to its route', async () => {
    const client = buildClient();
    mockFetch.mockResolvedValue(ok({ message: 'ok' }));

    await client.startAccountRecovery('phone');
    await client.verifyAccountRecovery('123456');
    await client.getAccountRecoveryStatus();
    await client.cancelAccountRecovery('cancel-token');
    await client.listAccountRecoveryRequests();
    await client.cancelAccountRecoveryRequest('req/1');

    expect(mockFetch.mock.calls).toEqual([
      ['/recovery/start', { method: 'POST', body: JSON.stringify({ channel: 'phone' }) }],
      ['/recovery/verify', { method: 'POST', body: JSON.stringify({ code: '123456' }) }],
      ['/recovery/status', { method: 'GET' }],
      [
        '/recovery/cancel',
        { method: 'POST', body: JSON.stringify({ cancelToken: 'cancel-token' }) },
      ],
      ['/recovery/requests', { method: 'GET' }],
      ['/recovery/requests/req%2F1', { method: 'DELETE' }],
    ]);
  });

  it('completes into a recovery session', async () => {
    const client = buildClient();
    mockFetch.mockResolvedValueOnce(ok(recoverySession));

    const { data } = await client.completeAccountRecovery();

    expect(mockFetch).toHaveBeenCalledWith('/recovery/complete', {
      method: 'POST',
      body: '{}',
    });
    expect(data).not.toHaveProperty('token');
    expect(client.isRecoverySession()).toBe(true);
  });
});

describe('enrollment from a recovery session', () => {
  const registerOnce = () => {
    mockFetch
      .mockResolvedValueOnce(ok({ challenge: 'c' }))
      .mockResolvedValueOnce(ok({ message: 'Success' }));
    (startRegistration as jest.Mock).mockResolvedValueOnce({ id: 'cred' });
  };
  const metadata = {
    friendlyName: 'mac',
    platform: 'mac',
    browser: 'chrome',
    deviceInfo: 'mac',
  };

  it('refreshes after a passkey is registered so the token drops the claim', async () => {
    const client = buildClient();
    mockFetch.mockResolvedValueOnce(ok(recoverySession));
    await client.redeemRecoveryCode('code');
    registerOnce();

    const { error } = await client.registerPasskey(metadata);

    expect(error).toBeNull();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(client.isRecoverySession()).toBe(false);
  });

  it('does not refresh after a registration in a normal session', async () => {
    const client = buildClient();
    registerOnce();

    await client.registerPasskey(metadata);

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('refreshes after a TOTP enrollment', async () => {
    const client = buildClient();
    mockFetch.mockResolvedValueOnce(ok(recoverySession));
    await client.completeAccountRecovery();
    mockFetch.mockResolvedValueOnce(ok({ message: 'Success' }));

    await client.verifyTotpEnrollment('123456');

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(client.isRecoverySession()).toBe(false);
  });

  it('keeps the enrollment when the refresh fails, and tries again next time', async () => {
    const client = buildClient();
    mockFetch.mockResolvedValueOnce(ok(recoverySession));
    await client.redeemRecoveryCode('code');
    mockRefresh.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(false);
    mockFetch.mockResolvedValue(ok({ message: 'Success' }));

    await expect(client.verifyTotpEnrollment('1')).resolves.toMatchObject({
      error: null,
    });
    await client.verifyTotpEnrollment('2');

    expect(mockRefresh).toHaveBeenCalledTimes(2);
    expect(client.isRecoverySession()).toBe(true);
  });

  it('forgets the recovery session on sign out', async () => {
    const client = buildClient();
    mockFetch.mockResolvedValueOnce(ok(recoverySession));
    await client.redeemRecoveryCode('code');
    mockFetch.mockResolvedValue(ok({ message: 'ok' }));

    await client.logout();
    expect(client.isRecoverySession()).toBe(false);

    mockFetch.mockResolvedValueOnce(ok(recoverySession));
    await client.redeemRecoveryCode('code');
    mockFetch.mockResolvedValue(ok({ message: 'ok' }));
    await client.logoutAllSessions();
    expect(client.isRecoverySession()).toBe(false);
  });
});

describe('session store', () => {
  it('reports a recovery session after a code is redeemed', async () => {
    const session = createAuthSession({
      apiHost: 'https://api.example.com',
      storage: createMemoryStorage(),
    });
    mockFetch
      .mockResolvedValueOnce(ok(recoverySession))
      .mockResolvedValueOnce(ok({ user: { id: 'user-1' }, credentials: [] }));

    await session.actions.redeemRecoveryCode('code');

    expect(session.getState()).toMatchObject({
      isAuthenticated: true,
      recoverySession: true,
    });
  });

  it('reports a recovery session after account recovery completes', async () => {
    const session = createAuthSession({
      apiHost: 'https://api.example.com',
      storage: createMemoryStorage(),
    });
    mockFetch
      .mockResolvedValueOnce(ok(recoverySession))
      .mockResolvedValueOnce(ok({ user: { id: 'user-1' }, credentials: [] }));

    await session.actions.completeAccountRecovery();

    expect(session.getState().recoverySession).toBe(true);
  });
});

describe('error helpers', () => {
  it('recognizes codes at the top level and under details', () => {
    const top = new SeamlessAuthError('x', 403, { error: 'enrollment_required' });
    const nested = new SeamlessAuthError('x', 503, {
      error: 'Owner could not be notified',
      details: { error: 'recovery_notice_failed' },
    });

    expect(isEnrollmentRequired(top)).toBe(true);
    expect(isStepUpRequired(top)).toBe(false);
    expect(getRecoveryErrorCode(nested)).toBe('recovery_notice_failed');
    expect(getRecoveryErrorCode(new SeamlessAuthError('x', 400, 'text'))).toBeUndefined();
    expect(getRecoveryErrorCode(new SeamlessAuthError('x', 400, { details: 1 }))).toBe(
      undefined
    );
    expect(getRecoveryErrorCode(new Error('x'))).toBeUndefined();
    expect(isStepUpRequired(new Error('x'))).toBe(false);
  });
});

describe('recovery flows', () => {
  it('reads which recovery paths the instance offers', async () => {
    const config = (data: unknown, error: unknown = null) => ({
      getPublicSystemConfig: jest.fn().mockResolvedValue({ data, error }),
    });

    await expect(
      loadRecoveryOptions(
        config({ loginMethods: [], recoveryCodes: true, accountRecovery: false })
      )
    ).resolves.toEqual({ recoveryCodes: true, accountRecovery: false });
    await expect(loadRecoveryOptions(config(null, new Error('x')))).resolves.toEqual({
      recoveryCodes: false,
      accountRecovery: false,
    });
    await expect(
      loadRecoveryOptions({
        getPublicSystemConfig: jest.fn().mockRejectedValue(new Error('x')),
      })
    ).resolves.toEqual({ recoveryCodes: false, accountRecovery: false });
  });

  it('maps failures to copy', () => {
    expect(
      recoveryErrorMessage(
        new SeamlessAuthError('x', 403, { error: 'account_recovery_disabled' })
      )
    ).toMatch(/turned off/);
    expect(
      recoveryErrorMessage(
        new SeamlessAuthError('x', 403, { error: 'enrollment_required' })
      )
    ).toMatch(/new passkey/);
    expect(recoveryErrorMessage(new Error('x'), 'Fallback')).toBe('Fallback');
    expect(recoveryErrorMessage(undefined)).toMatch(/try again/);
  });

  it('reads the cancel token from the fragment', () => {
    expect(recoveryCancelTokenFromHash('#abc.def')).toBe('abc.def');
    expect(recoveryCancelTokenFromHash('abc%20')).toBe('abc');
    expect(recoveryCancelTokenFromHash('#')).toBeNull();
    expect(recoveryCancelTokenFromHash('#%E0%A4%A')).toBeNull();
  });

  it('cancels from a link', async () => {
    const client = {
      cancelAccountRecovery: jest
        .fn()
        .mockResolvedValueOnce({ data: { message: 'ok' }, error: null })
        .mockResolvedValueOnce({ data: null, error: new SeamlessAuthError('x', 429) }),
    };

    await expect(cancelRecoveryFromLink(client, 't')).resolves.toEqual({
      kind: 'cancelled',
    });
    await expect(cancelRecoveryFromLink(client, 't')).resolves.toMatchObject({
      kind: 'error',
      message: expect.stringMatching(/could not cancel/),
    });
    await expect(cancelRecoveryFromLink(client, null)).resolves.toMatchObject({
      kind: 'error',
    });
    expect(client.cancelAccountRecovery).toHaveBeenCalledTimes(2);
  });

  describe('generateRecoveryCodesWithStepUp', () => {
    const codes = { message: 'Success', codes: ['A'], createdAt: 'now' };
    const stepUpRequired = {
      data: null,
      error: new SeamlessAuthError('x', 403, { error: 'step_up_required' }),
    };

    it('generates a first set without a step-up', async () => {
      const verifyStepUp = jest.fn();
      const client = {
        generateRecoveryCodes: jest.fn().mockResolvedValue({ data: codes, error: null }),
      };

      await expect(
        generateRecoveryCodesWithStepUp({ client, verifyStepUp })
      ).resolves.toEqual({ kind: 'generated', codes });
      expect(verifyStepUp).not.toHaveBeenCalled();
    });

    it('steps up and tries again when the API asks for it', async () => {
      const verifyStepUp = jest.fn().mockResolvedValue({ data: {}, error: null });
      const client = {
        generateRecoveryCodes: jest
          .fn()
          .mockResolvedValueOnce(stepUpRequired)
          .mockResolvedValueOnce({ data: codes, error: null }),
      };

      await expect(
        generateRecoveryCodesWithStepUp({ client, verifyStepUp })
      ).resolves.toEqual({ kind: 'generated', codes });
      expect(verifyStepUp).toHaveBeenCalledTimes(1);
    });

    it('stops when the step-up fails', async () => {
      const verifyStepUp = jest
        .fn()
        .mockResolvedValue({ data: null, error: new SeamlessAuthError('x', 0) });
      const client = {
        generateRecoveryCodes: jest.fn().mockResolvedValue(stepUpRequired),
      };

      await expect(
        generateRecoveryCodesWithStepUp({ client, verifyStepUp })
      ).resolves.toMatchObject({
        kind: 'error',
        message: expect.stringMatching(/passkey/),
      });
      expect(client.generateRecoveryCodes).toHaveBeenCalledTimes(1);
    });

    it('reports other failures, before and after a step-up', async () => {
      const disabled = {
        data: null,
        error: new SeamlessAuthError('x', 403, { error: 'recovery_codes_disabled' }),
      };
      const verifyStepUp = jest.fn().mockResolvedValue({ data: {}, error: null });

      await expect(
        generateRecoveryCodesWithStepUp({
          client: { generateRecoveryCodes: jest.fn().mockResolvedValue(disabled) },
          verifyStepUp,
        })
      ).resolves.toMatchObject({ kind: 'error', message: expect.stringMatching(/off/) });

      await expect(
        generateRecoveryCodesWithStepUp({
          client: {
            generateRecoveryCodes: jest
              .fn()
              .mockResolvedValueOnce(stepUpRequired)
              .mockResolvedValueOnce({
                data: null,
                error: new SeamlessAuthError('x', 500),
              }),
          },
          verifyStepUp,
        })
      ).resolves.toEqual({
        kind: 'error',
        message: 'Failed to generate recovery codes.',
      });
    });
  });

  it('formats codes for saving', () => {
    expect(recoveryCodesText(['A', 'B'], 'Acme')).toBe(
      'Recovery codes for Acme. Each code works once.\n\nA\nB\n'
    );
  });

  it('describes passkeys', () => {
    const base = {
      id: '1',
      createdAt: 'now',
      counter: 0,
      backedup: false,
      backedUp: false,
    } as Credential;

    expect(passkeyKind({ ...base, transports: ['usb'] })).toBe('security_key');
    expect(passkeyKind({ ...base, deviceType: 'multiDevice' })).toBe('synced');
    expect(passkeyKind({ ...base, transports: ['internal'] })).toBe('device_bound');
    expect(passkeyDisplayName({ ...base, friendlyName: 'Work laptop' })).toBe(
      'Work laptop'
    );
    expect(passkeyDisplayName({ ...base, deviceInfo: 'mac • chrome' })).toBe(
      'mac • chrome'
    );
    expect(passkeyDisplayName(base)).toBe('Passkey');
  });
});
