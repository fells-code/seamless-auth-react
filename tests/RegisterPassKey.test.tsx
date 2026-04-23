/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPasskey from '../src/views/PassKeyRegistration';
import { useAuthClient } from '@/hooks/useAuthClient';
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
      success: true,
      message: 'Passkey registered successfully.',
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
      success: false,
      message: 'Failed to fetch passkey registration challenge.',
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
      success: false,
      message: 'WebAuthnError',
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
      success: false,
      message: 'Verification failed.',
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

    expect(screen.getByText(/passkeys are not supported on this device/i)).toBeInTheDocument();
  });
});
