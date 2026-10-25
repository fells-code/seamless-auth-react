/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { SeamlessAuthError } from '@seamless-auth/client';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { useAuth } from '@/AuthProvider';
import { useAuthClient } from '@/hooks/useAuthClient';
import AccountRecovery from '@/views/AccountRecovery';
import RecoveryCancel from '@/views/RecoveryCancel';
import RecoveryCodeLogin from '@/views/RecoveryCodeLogin';
import RecoveryCodes from '@/views/RecoveryCodes';

jest.mock('@/AuthProvider');
jest.mock('@/hooks/useAuthClient');

const failure = (status: number, body: unknown) => ({
  data: null,
  error: new SeamlessAuthError('failed', status, body),
});
const success = <T,>(data: T) => ({ data, error: null });

const LocationProbe = () => {
  const location = useLocation();
  return (
    <span data-testid="location">
      {location.pathname}
      {location.search}
      {location.hash}
    </span>
  );
};

const renderAt = (
  element: React.ReactElement,
  path: string,
  entry: { pathname: string; hash?: string; state?: unknown } = { pathname: path }
) =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={<div>Elsewhere</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </StrictMode>
  );

const client = {
  getRecoveryCodeStatus: jest.fn(),
  generateRecoveryCodes: jest.fn(),
  startAccountRecovery: jest.fn(),
  verifyAccountRecovery: jest.fn(),
  getAccountRecoveryStatus: jest.fn(),
  cancelAccountRecovery: jest.fn(),
};
const auth = {
  redeemRecoveryCode: jest.fn(),
  completeAccountRecovery: jest.fn(),
  verifyStepUpWithPasskey: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthClient as jest.Mock).mockReturnValue(client);
  (useAuth as jest.Mock).mockReturnValue(auth);
});

describe('RecoveryCodeLogin', () => {
  const submit = (code: string) => {
    fireEvent.change(screen.getByLabelText('Recovery code'), {
      target: { value: code },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  };

  it('redeems the code and continues to passkey enrollment', async () => {
    auth.redeemRecoveryCode.mockResolvedValue(
      success({ message: 'Success', recovery: true, nextStep: 'enroll_passkey' })
    );
    renderAt(<RecoveryCodeLogin />, '/recovery-code');

    submit(' abcde-fghij ');

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/register-passkey')
    );
    expect(auth.redeemRecoveryCode).toHaveBeenCalledWith('abcde-fghij');
  });

  it('explains a wrong code', async () => {
    auth.redeemRecoveryCode.mockResolvedValue(
      failure(401, { error: 'invalid_recovery_code' })
    );
    renderAt(<RecoveryCodeLogin />, '/recovery-code');

    submit('wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent(/not valid/);
  });

  it('asks to sign in again for any other failure', async () => {
    auth.redeemRecoveryCode.mockResolvedValue(failure(401, { error: 'unauthorized' }));
    renderAt(<RecoveryCodeLogin />, '/recovery-code');

    submit('code');

    expect(await screen.findByRole('alert')).toHaveTextContent(/sign in again/);
  });

  it('goes back to sign in', () => {
    renderAt(<RecoveryCodeLogin />, '/recovery-code');

    fireEvent.click(screen.getByText('Back to sign in'));

    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});

describe('RecoveryCancel', () => {
  it('drops the token from the address bar, then cancels with it', async () => {
    client.cancelAccountRecovery.mockResolvedValue(success({ message: 'ok' }));

    renderAt(<RecoveryCancel />, '/recovery/cancel', {
      pathname: '/recovery/cancel',
      hash: '#cancel-token-1',
    });

    expect(await screen.findByText(/is cancelled/)).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/recovery\/cancel$/);
    expect(client.cancelAccountRecovery).toHaveBeenCalledTimes(1);
    expect(client.cancelAccountRecovery).toHaveBeenCalledWith('cancel-token-1');
  });

  it('says the link is incomplete without a token', async () => {
    renderAt(<RecoveryCancel />, '/recovery/cancel');

    expect(await screen.findByRole('alert')).toHaveTextContent(/incomplete/);
    expect(client.cancelAccountRecovery).not.toHaveBeenCalled();
  });

  it('reports a failed cancel', async () => {
    client.cancelAccountRecovery.mockResolvedValue(failure(429, {}));
    renderAt(<RecoveryCancel />, '/recovery/cancel', {
      pathname: '/recovery/cancel',
      hash: '#t',
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not cancel/);
    fireEvent.click(screen.getByText('Go to sign in'));
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});

describe('RecoveryCodes', () => {
  const renderCodes = () =>
    renderAt(<RecoveryCodes />, '/recovery-codes', {
      pathname: '/recovery-codes',
      state: { returnTo: '/dashboard' },
    });

  it('generates a first set once, and continues after the user confirms saving it', async () => {
    client.getRecoveryCodeStatus.mockResolvedValue(
      success({ enabled: true, remaining: 0, total: 0, createdAt: null })
    );
    client.generateRecoveryCodes.mockResolvedValue(
      success({
        message: 'Success',
        codes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'],
        createdAt: 'x',
      })
    );

    renderCodes();

    expect(await screen.findByText('AAAAA-BBBBB')).toBeInTheDocument();
    expect(client.generateRecoveryCodes).toHaveBeenCalledTimes(1);

    const continueButton = screen.getByRole('button', { name: 'Continue' });
    expect(continueButton).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I have saved/));
    fireEvent.click(continueButton);

    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
  });

  it('moves straight on when the user already has unused codes', async () => {
    client.getRecoveryCodeStatus.mockResolvedValue(
      success({ enabled: true, remaining: 9, total: 10, createdAt: 'x' })
    );

    renderCodes();

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/dashboard')
    );
    expect(client.generateRecoveryCodes).not.toHaveBeenCalled();
  });

  it('moves straight on when the instance has recovery codes off or cannot answer', async () => {
    client.getRecoveryCodeStatus.mockResolvedValue(failure(404, {}));

    renderCodes();

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/dashboard')
    );
  });

  it('offers a new set when every code is spent, stepping up first', async () => {
    client.getRecoveryCodeStatus.mockResolvedValue(
      success({ enabled: true, remaining: 0, total: 10, createdAt: 'x' })
    );
    client.generateRecoveryCodes
      .mockResolvedValueOnce(failure(403, { error: 'step_up_required' }))
      .mockResolvedValueOnce(
        success({ message: 'Success', codes: ['NEW'], createdAt: 'x' })
      );
    auth.verifyStepUpWithPasskey.mockResolvedValue(success({ fresh: true }));

    renderCodes();

    expect(
      await screen.findByText(/used all of your recovery codes/)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Generate recovery codes' }));

    expect(await screen.findByText('NEW')).toBeInTheDocument();
    expect(auth.verifyStepUpWithPasskey).toHaveBeenCalledTimes(1);
  });

  it('lets the user skip when generating fails', async () => {
    client.getRecoveryCodeStatus.mockResolvedValue(
      success({ enabled: true, remaining: 0, total: 0, createdAt: null })
    );
    client.generateRecoveryCodes.mockResolvedValue(failure(500, {}));

    renderCodes();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Failed to generate/);
    fireEvent.click(screen.getByText('Skip for now'));
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
  });
});

describe('AccountRecovery', () => {
  const pending = {
    state: 'pending',
    requestedAt: '2026-10-24T10:00:00.000Z',
    completesAt: '2026-10-25T10:00:00.000Z',
  };

  const enterCode = (code: string) => {
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: code } });
  };

  it('starts, verifies and waits out the delay, then finishes into enrollment', async () => {
    client.startAccountRecovery.mockResolvedValue(success({ message: 'sent' }));
    client.verifyAccountRecovery.mockResolvedValue(success(pending));
    client.getAccountRecoveryStatus.mockResolvedValue(
      success({ ...pending, state: 'ready' })
    );
    auth.completeAccountRecovery.mockResolvedValue(
      success({ message: 'Success', recovery: true, nextStep: 'enroll_passkey' })
    );

    renderAt(<AccountRecovery />, '/account-recovery');

    fireEvent.click(screen.getByText('Send a code by text message'));
    expect(await screen.findByText(/verified text message/)).toBeInTheDocument();
    expect(client.startAccountRecovery).toHaveBeenCalledWith('phone');

    enterCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText(/request is open/)).toBeInTheDocument();
    expect(client.verifyAccountRecovery).toHaveBeenCalledWith('123456');

    fireEvent.click(screen.getByText('Check again'));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish recovery' }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/register-passkey')
    );
  });

  it('explains a refused start', async () => {
    client.startAccountRecovery.mockResolvedValue(
      failure(403, { error: 'account_recovery_disabled' })
    );
    renderAt(<AccountRecovery />, '/account-recovery');

    fireEvent.click(screen.getByText('Send a code by email'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/turned off/);
  });

  it('explains that the owner could not be notified', async () => {
    client.startAccountRecovery.mockResolvedValue(success({ message: 'sent' }));
    client.verifyAccountRecovery.mockResolvedValue(
      failure(503, { error: 'recovery_notice_failed' })
    );
    renderAt(<AccountRecovery />, '/account-recovery');

    fireEvent.click(screen.getByText('Send a code by email'));
    await screen.findByText(/verified email/);
    enterCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not notify you/);
  });

  it('tells a wrong code apart from a lapsed sign-in', async () => {
    client.startAccountRecovery.mockResolvedValue(success({ message: 'sent' }));
    client.verifyAccountRecovery
      .mockResolvedValueOnce(failure(401, { error: 'invalid_recovery_code' }))
      .mockResolvedValueOnce(failure(401, { error: 'unauthorized' }));
    renderAt(<AccountRecovery />, '/account-recovery');

    fireEvent.click(screen.getByText('Send a code by email'));
    await screen.findByText(/verified email/);
    enterCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not valid/);

    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/timed out/));

    fireEvent.click(screen.getByText('Use a different method'));
    expect(screen.getByText('Send a code by email')).toBeInTheDocument();
  });

  it('reports a request that was cancelled or already completed', async () => {
    client.startAccountRecovery.mockResolvedValue(success({ message: 'sent' }));
    client.verifyAccountRecovery.mockResolvedValue(
      success({ ...pending, state: 'cancelled' })
    );
    client.getAccountRecoveryStatus.mockResolvedValue(failure(500, {}));
    renderAt(<AccountRecovery />, '/account-recovery');

    fireEvent.click(screen.getByText('Send a code by email'));
    await screen.findByText(/verified email/);
    enterCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText(/was cancelled/)).toBeInTheDocument();
  });

  it('shows a completed request and a failed finish', async () => {
    client.startAccountRecovery.mockResolvedValue(success({ message: 'sent' }));
    client.verifyAccountRecovery.mockResolvedValue(
      success({ ...pending, state: 'ready' })
    );
    auth.completeAccountRecovery.mockResolvedValue(
      failure(409, { error: 'recovery_not_ready' })
    );
    client.getAccountRecoveryStatus.mockResolvedValue(
      success({ ...pending, state: 'completed' })
    );
    renderAt(<AccountRecovery />, '/account-recovery');

    fireEvent.click(screen.getByText('Send a code by email'));
    await screen.findByText(/verified email/);
    enterCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish recovery' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/still waiting/);
  });

  it('reports a status check that fails', async () => {
    client.startAccountRecovery.mockResolvedValue(success({ message: 'sent' }));
    client.verifyAccountRecovery.mockResolvedValue(success(pending));
    client.getAccountRecoveryStatus.mockResolvedValue(failure(500, {}));
    renderAt(<AccountRecovery />, '/account-recovery');

    fireEvent.click(screen.getByText('Send a code by email'));
    await screen.findByText(/verified email/);
    enterCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    fireEvent.click(await screen.findByText('Check again'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not check/);
    await act(async () => {
      fireEvent.click(screen.getByText('Back to sign in'));
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});
