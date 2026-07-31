/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPasskey from '../src/views/PassKeyRegistration';
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

// Mock modal so we control confirm manually
jest.mock('@/components/DeviceNameModal', () => (props: any) => {
  if (!props.isOpen) return null;
  return (
    <div>
      <button onClick={() => props.onConfirm('My Device')}>Confirm</button>
      <button onClick={props.onCancel}>Cancel</button>
    </div>
  );
});

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

  it('opens modal when clicking register', async () => {
    render(<RegisterPasskey />);

    const btn = await screen.findByText(/Register Passkey/i);
    fireEvent.click(btn);

    expect(await screen.findByText('Confirm')).toBeInTheDocument();
  });

  it('handles successful registration flow', async () => {
    mockRegisterPasskey.mockResolvedValueOnce({
      data: { credentialId: 'cred', prfCapable: false },
      error: null,
    });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));
    fireEvent.click(await screen.findByText('Confirm'));

    await waitFor(() => {
      expect(mockRegisterPasskey).toHaveBeenCalledWith({
        friendlyName: 'My Device',
        platform: 'macOS',
        browser: 'Chrome',
        deviceInfo: 'MacBook Pro',
      });
    });

    expect(mockRefreshSession).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('handles challenge failure', async () => {
    mockRegisterPasskey.mockResolvedValueOnce({
      data: null,
      error: new Error('Failed to fetch passkey registration challenge.'),
    });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));
    fireEvent.click(await screen.findByText('Confirm'));

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
    fireEvent.click(await screen.findByText('Confirm'));

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
    fireEvent.click(await screen.findByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText(/Error registering passkey/i)).toBeInTheDocument();
    });
  });

  it('handles canceling modal', async () => {
    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));
    fireEvent.click(await screen.findByText('Cancel'));

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
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
});
