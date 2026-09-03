/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPasskey from '../src/views/PassKeyRegistration';
import { SeamlessAuthError } from '@/client/errors';
import { useAuthClient } from '@/hooks/useAuthClient';
import { useLoginMethods } from '@/hooks/useLoginMethods';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';

const mockNavigate = jest.fn();
const mockRefreshSession = jest.fn();
const mockRegisterPasskey = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@/AuthProvider', () => ({
  useAuth: () => ({
    refreshSession: mockRefreshSession,
  }),
}));

jest.mock('@/hooks/useAuthClient');
jest.mock('@/hooks/usePasskeySupport');

// hasNonPasskeyLoginMethod stays real: it encodes the rule that decides whether
// a skip is safe to offer, so mocking it would test nothing.
jest.mock('@/hooks/useLoginMethods', () => ({
  ...jest.requireActual('@/hooks/useLoginMethods'),
  useLoginMethods: jest.fn(),
}));

jest.mock('@/utils', () => ({
  parseUserAgent: jest.fn().mockReturnValue({
    platform: 'macOS',
    browser: 'Chrome',
    deviceInfo: 'MacBook Pro',
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthClient as jest.Mock).mockReturnValue({
    registerPasskey: mockRegisterPasskey,
  });
  (usePasskeySupport as jest.Mock).mockReturnValue({
    passkeySupported: true,
    loading: false,
  });
  (useLoginMethods as jest.Mock).mockReturnValue({
    loginMethods: ['passkey', 'magic_link'],
    loading: false,
  });
});

describe('RegisterPasskey', () => {
  it('renders supported UI', async () => {
    render(<RegisterPasskey />);
    expect(await screen.findByText(/Secure Your Account/i)).toBeInTheDocument();
  });

  it('handles successful registration flow', async () => {
    mockRegisterPasskey.mockResolvedValueOnce({
      data: { credentialId: 'cred', prfCapable: false },
      error: null,
    });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));

    await waitFor(() => {
      expect(mockRegisterPasskey).toHaveBeenCalledWith({
        metadata: {
          friendlyName: 'MacBook Pro',
          platform: 'macOS',
          browser: 'Chrome',
          deviceInfo: 'MacBook Pro',
        },
        attachment: undefined,
      });
    });

    expect(mockRefreshSession).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  // The button used to open a form asking for a name. Registration now goes
  // straight to the browser prompt, so nothing may stand between the two.
  it('asks for no name before starting the ceremony', async () => {
    mockRegisterPasskey.mockResolvedValueOnce({ data: {}, error: null });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockRegisterPasskey).toHaveBeenCalled();
    });
  });

  it('handles challenge failure', async () => {
    mockRegisterPasskey.mockResolvedValueOnce({
      data: null,
      error: new Error('Failed to fetch passkey registration challenge.'),
    });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));

    await waitFor(() => {
      expect(screen.getByText(/Error registering passkey/i)).toBeInTheDocument();
    });
  });

  it('handles WebAuthnError', async () => {
    mockRegisterPasskey.mockResolvedValueOnce({
      data: null,
      error: new Error('WebAuthnError'),
    });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));

    await waitFor(() => {
      expect(screen.getByText(/Error registering passkey/i)).toBeInTheDocument();
    });
  });

  it('handles verification failure', async () => {
    mockRegisterPasskey.mockResolvedValueOnce({
      data: null,
      error: new Error('Verification failed.'),
    });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));

    await waitFor(() => {
      expect(screen.getByText(/Error registering passkey/i)).toBeInTheDocument();
    });
  });

  it('renders unsupported state when passkeys are unavailable', () => {
    (usePasskeySupport as jest.Mock).mockReturnValue({
      passkeySupported: false,
      loading: false,
    });

    render(<RegisterPasskey />);

    expect(screen.getByText(/Passkeys are not available here/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This device does not support passkeys/i)
    ).toBeInTheDocument();
  });
});

describe('RegisterPasskey skip control', () => {
  it('offers a skip when another login method is enabled', async () => {
    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Skip for now/i));

    await waitFor(() => {
      expect(mockRefreshSession).toHaveBeenCalled();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(mockRegisterPasskey).not.toHaveBeenCalled();
  });

  // Skipping here would leave the user with no way back into the account they
  // just created, so the control must not exist at all.
  it('offers no skip when passkey is the only login method', async () => {
    (useLoginMethods as jest.Mock).mockReturnValue({
      loginMethods: ['passkey'],
      loading: false,
    });

    render(<RegisterPasskey />);

    await screen.findByText(/Secure Your Account/i);
    expect(screen.queryByText(/Skip for now/i)).not.toBeInTheDocument();
  });

  it('offers no skip while the login methods are still unknown', async () => {
    (useLoginMethods as jest.Mock).mockReturnValue({
      loginMethods: null,
      loading: false,
    });

    render(<RegisterPasskey />);

    await screen.findByText(/Secure Your Account/i);
    expect(screen.queryByText(/Skip for now/i)).not.toBeInTheDocument();
  });

  it('gives an unsupported device a way forward when another method is enabled', async () => {
    (usePasskeySupport as jest.Mock).mockReturnValue({
      passkeySupported: false,
      loading: false,
    });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/^Continue$/i));

    await waitFor(() => {
      expect(mockRefreshSession).toHaveBeenCalled();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('tells an unsupported device it is stuck when passkey is the only method', async () => {
    (usePasskeySupport as jest.Mock).mockReturnValue({
      passkeySupported: false,
      loading: false,
    });
    (useLoginMethods as jest.Mock).mockReturnValue({
      loginMethods: ['passkey'],
      loading: false,
    });

    render(<RegisterPasskey />);

    expect(await screen.findByText(/requires one to sign in/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Continue$/i)).not.toBeInTheDocument();
  });

  it('requests a cross-platform authenticator from the security key path', async () => {
    mockRegisterPasskey.mockResolvedValueOnce({ data: {}, error: null });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Use a security key instead/i));

    await waitFor(() => {
      expect(mockRegisterPasskey).toHaveBeenCalledWith({
        metadata: {
          friendlyName: 'MacBook Pro',
          platform: 'macOS',
          browser: 'Chrome',
          deviceInfo: 'MacBook Pro',
        },
        attachment: 'cross-platform',
      });
    });
  });

  // The refusal names something the user can act on, so it has to reach the
  // screen instead of the generic failure the catch would otherwise show.
  it('explains a policy refusal instead of showing the raw code', async () => {
    mockRegisterPasskey.mockResolvedValueOnce({
      data: null,
      error: new SeamlessAuthError('synced_passkey_not_allowed', 403, {
        error: 'synced_passkey_not_allowed',
      }),
    });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));

    expect(await screen.findByText(/stays on a single device/i)).toBeInTheDocument();
    expect(screen.queryByText(/synced_passkey_not_allowed/)).not.toBeInTheDocument();
  });

  it('falls back to the generic message when a failure carries no policy code', async () => {
    mockRegisterPasskey.mockResolvedValueOnce({
      data: null,
      error: new SeamlessAuthError('Verification failed.', 500),
    });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));

    expect(await screen.findByText('Error registering passkey.')).toBeInTheDocument();
  });

  // The attachment the user asked for is refused at register/start, before any
  // ceremony, so the screen has to explain it rather than appear to hang.
  it('explains a refused attachment from the security key path', async () => {
    mockRegisterPasskey.mockResolvedValueOnce({
      data: null,
      error: new SeamlessAuthError('attachment_not_allowed', 400, {
        error: 'attachment_not_allowed',
      }),
    });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Use a security key instead/i));

    expect(
      await screen.findByText(/does not accept that kind of authenticator/i)
    ).toBeInTheDocument();
  });
});
