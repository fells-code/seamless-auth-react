/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { SeamlessAuthError } from '@seamless-auth/client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { useAuth } from '@/AuthProvider';
import TotpQrCode from '@/components/TotpQrCode';
import { useAuthClient } from '@/hooks/useAuthClient';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import AuthenticatorCodeLogin from '@/views/AuthenticatorCodeLogin';
import AuthenticatorRegistration from '@/views/AuthenticatorRegistration';

jest.mock('@/AuthProvider');
jest.mock('@/hooks/useAuthClient');
jest.mock('@/hooks/usePasskeySupport');

const failure = (status: number, body: unknown = {}) => ({
  data: null,
  error: new SeamlessAuthError('failed', status, body),
});
const success = <T,>(data: T) => ({ data, error: null });

const LocationProbe = () => {
  const location = useLocation();
  return (
    <>
      <span data-testid="location">{location.pathname}</span>
      <span data-testid="state">{JSON.stringify(location.state ?? null)}</span>
    </>
  );
};

const renderAt = (element: React.ReactElement, path: string, state?: unknown) =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[{ pathname: path, state }]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={<div>Elsewhere</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </StrictMode>
  );

const enterCode = (code: string) =>
  fireEvent.change(screen.getByLabelText('Digit 1'), { target: { value: code } });

const client = {
  verifyTotpLogin: jest.fn(),
  startTotpEnrollment: jest.fn(),
  verifyTotpEnrollment: jest.fn(),
};
let auth: Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  auth = {
    refreshSession: jest.fn().mockResolvedValue(success({})),
    recoverySession: false,
  };
  (useAuth as jest.Mock).mockImplementation(() => auth);
  (useAuthClient as jest.Mock).mockReturnValue(client);
  (usePasskeySupport as jest.Mock).mockReturnValue({
    passkeySupported: true,
    loading: false,
  });
});

describe('AuthenticatorCodeLogin', () => {
  const signIn = (code: string) => {
    enterCode(code);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  };

  it('signs in with a code and refreshes the session', async () => {
    client.verifyTotpLogin.mockResolvedValue(success({ message: 'Success' }));
    renderAt(<AuthenticatorCodeLogin />, '/authenticator-code');

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    signIn('123456');

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/));
    expect(client.verifyTotpLogin).toHaveBeenCalledWith('123456');
    expect(auth.refreshSession).toHaveBeenCalled();
  });

  it.each([
    [
      'a wrong or reused code',
      failure(401, { error: 'totp_verification_failed' }),
      /Each code works once/,
    ],
    [
      'a lockout',
      failure(423, { error: 'account_locked', retryAfterSeconds: 300 }),
      /Try again in 5 minutes/,
    ],
    ['a rate limit', failure(429), /Wait a moment/],
    [
      'a passkey-only account',
      failure(403, { error: 'login_method_disabled' }),
      /Use your passkey instead/,
    ],
    ['anything else', failure(500), /could not sign you in/],
  ])('explains %s and clears the code', async (_name, result, message) => {
    client.verifyTotpLogin.mockResolvedValue(result);
    renderAt(<AuthenticatorCodeLogin />, '/authenticator-code');

    signIn('123456');

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('Digit 1')).toHaveValue('');
    expect(screen.getByTestId('location')).toHaveTextContent('/authenticator-code');
    expect(auth.refreshSession).not.toHaveBeenCalled();
  });

  it('goes back to sign in', () => {
    renderAt(<AuthenticatorCodeLogin />, '/authenticator-code');

    fireEvent.click(screen.getByRole('button', { name: 'Back to sign in' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});

describe('AuthenticatorRegistration', () => {
  const enrollment = {
    message: 'ok',
    secret: 'JBSWY3DPEHPK3PXP',
    otpauthUrl: 'otpauth://totp/App:user?secret=JBSWY3DPEHPK3PXP',
    issuer: 'App',
    accountName: 'user',
  };

  it('enrolls once, shows success, then continues to recovery codes', async () => {
    auth.recoverySession = true;
    client.startTotpEnrollment.mockResolvedValue(success(enrollment));
    client.verifyTotpEnrollment.mockImplementation(async () => {
      auth.recoverySession = false;
      return success({ message: 'ok' });
    });

    renderAt(<AuthenticatorRegistration />, '/register-authenticator', {
      returnTo: '/dashboard',
    });

    expect(screen.getByText(/signed in to recover your account/)).toBeInTheDocument();
    expect(await screen.findByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
    expect(client.startTotpEnrollment).toHaveBeenCalledTimes(1);

    enterCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));

    expect(
      await screen.findByRole('heading', { name: 'Authenticator app added' })
    ).toBeInTheDocument();
    expect(auth.refreshSession).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/recovery-codes');
    expect(screen.getByTestId('state')).toHaveTextContent('{"returnTo":"/dashboard"}');
  });

  it('goes back to a passkey where the device supports one', async () => {
    client.startTotpEnrollment.mockResolvedValue(success(enrollment));
    renderAt(<AuthenticatorRegistration />, '/register-authenticator');

    expect(screen.queryByText(/signed in to recover/)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Use a passkey instead' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/register-passkey');
    expect(screen.getByTestId('state')).toHaveTextContent('{"returnTo":"/"}');
  });

  it('offers no passkey where the device has none', async () => {
    (usePasskeySupport as jest.Mock).mockReturnValue({
      passkeySupported: false,
      loading: false,
    });
    client.startTotpEnrollment.mockResolvedValue(failure(401));
    renderAt(<AuthenticatorRegistration />, '/register-authenticator');

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not start/);
    expect(screen.queryByText('Use a passkey instead')).not.toBeInTheDocument();
  });
});

describe('TotpQrCode', () => {
  it('renders nothing for text too long for a QR code', () => {
    const { container } = render(<TotpQrCode value={'x'.repeat(5000)} />);

    expect(container).toBeEmptyDOMElement();
  });
});
