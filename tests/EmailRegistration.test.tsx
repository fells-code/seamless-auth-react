/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import EmailRegistration from '@/views/EmailRegistration';

import { useAuth } from '@/AuthProvider';
import { useAuthClient } from '@/hooks/useAuthClient';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';

import { useNavigate } from 'react-router-dom';

jest.mock('@/AuthProvider');
jest.mock('@/hooks/useAuthClient');
jest.mock('@/hooks/usePasskeySupport');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('@/components/OtpInput', () => (props: any) => (
  <input
    data-testid="otp-input"
    value={props.value}
    onChange={e => props.onChange(e.target.value)}
  />
));

describe('EmailRegistration', () => {
  const navigate = jest.fn();
  const refreshSession = jest.fn();
  const mockAuthClient = {
    requestEmailOtp: jest.fn(),
    verifyEmailOtp: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();

    (useNavigate as jest.Mock).mockReturnValue(navigate);

    (useAuth as jest.Mock).mockReturnValue({
      refreshSession,
    });

    (useAuthClient as jest.Mock).mockReturnValue(mockAuthClient);
    (usePasskeySupport as jest.Mock).mockReturnValue({
      passkeySupported: false,
      loading: false,
    });

    mockAuthClient.requestEmailOtp.mockResolvedValue({ ok: true });
    mockAuthClient.verifyEmailOtp.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('renders verification page', () => {
    render(<EmailRegistration />);

    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
  });

  test('shows validation error if OTP is not 6 digits', async () => {
    render(<EmailRegistration />);

    fireEvent.change(screen.getByTestId('otp-input'), {
      target: { value: 'ABC' },
    });

    fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));
    expect(screen.getByText(/please enter a valid code/i)).toBeInTheDocument();
  });

  test('submits OTP and verifies email', async () => {
    mockAuthClient.verifyEmailOtp.mockResolvedValueOnce({ ok: true });

    render(<EmailRegistration />);

    fireEvent.change(screen.getByTestId('otp-input'), {
      target: { value: 'ABCDEF' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /verify & continue/i }));
    });

    expect(mockAuthClient.verifyEmailOtp).toHaveBeenCalledWith('ABCDEF');
  });

  test('resend email triggers API call', async () => {
    render(<EmailRegistration />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /resend code to email/i }));
    });

    expect(mockAuthClient.requestEmailOtp).toHaveBeenCalled();
  });

  test('timer counts down', () => {
    render(<EmailRegistration />);

    expect(screen.getByText(/05:00/)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/04:59/)).toBeInTheDocument();
  });

  test('successful verification navigates to registerPasskey if supported', async () => {
    (usePasskeySupport as jest.Mock).mockReturnValue({
      passkeySupported: true,
      loading: false,
    });
    mockAuthClient.verifyEmailOtp.mockResolvedValue({ ok: true });

    render(<EmailRegistration />);

    fireEvent.change(screen.getByTestId('otp-input'), {
      target: { value: 'ABCDEF' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));
    });

    expect(navigate).toHaveBeenCalledWith('/registerPasskey');
  });

  test('successful verification logs in if passkeys not supported', async () => {
    (usePasskeySupport as jest.Mock).mockReturnValue({
      passkeySupported: false,
      loading: false,
    });
    mockAuthClient.verifyEmailOtp.mockResolvedValue({ ok: true });

    render(<EmailRegistration />);

    fireEvent.change(screen.getByTestId('otp-input'), {
      target: { value: 'ABCDEF' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));
    });

    await act(async () => {});

    expect(refreshSession).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  test('back to login navigates to login page', () => {
    render(<EmailRegistration />);

    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));

    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
