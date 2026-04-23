/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import PhoneRegistration from '@/views/PhoneRegistration';

import { useAuthClient } from '@/hooks/useAuthClient';
import { useNavigate } from 'react-router-dom';

jest.mock('@/hooks/useAuthClient');
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

describe('PhoneRegistration', () => {
  const navigate = jest.fn();
  const mockAuthClient = {
    verifyPhoneOtp: jest.fn(),
    requestPhoneOtp: jest.fn(),
    requestEmailOtp: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();

    (useNavigate as jest.Mock).mockReturnValue(navigate);
    (useAuthClient as jest.Mock).mockReturnValue(mockAuthClient);

    mockAuthClient.verifyPhoneOtp.mockResolvedValue({ ok: true });
    mockAuthClient.requestPhoneOtp.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    mockAuthClient.requestEmailOtp.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    localStorage.clear();
  });

  test('renders phone verification screen', () => {
    render(<PhoneRegistration />);

    expect(screen.getByText(/verify your phone number/i)).toBeInTheDocument();
  });

  test('shows error when OTP is not 6 digits', () => {
    render(<PhoneRegistration />);

    fireEvent.change(screen.getByTestId('otp-input'), {
      target: { value: '123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));

    expect(screen.getByText(/please enter a valid code/i)).toBeInTheDocument();
  });

  test('submits OTP verification request', async () => {
    render(<PhoneRegistration />);

    fireEvent.change(screen.getByTestId('otp-input'), {
      target: { value: '123456' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /verify & continue/i }));
    });

    expect(mockAuthClient.verifyPhoneOtp).toHaveBeenCalledWith('123456');
  });

  test('resend SMS triggers API call', async () => {
    render(<PhoneRegistration />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /resend code to phone/i }));
    });

    expect(mockAuthClient.requestPhoneOtp).toHaveBeenCalled();
  });

  test('resend stores token if returned', async () => {
    mockAuthClient.requestPhoneOtp.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'abc123' }),
    });

    render(<PhoneRegistration />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /resend code to phone/i }));
    });

    expect(localStorage.getItem('token')).toBe('abc123');
  });

  test('timer counts down', () => {
    render(<PhoneRegistration />);

    expect(screen.getByText(/05:00/)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/04:59/)).toBeInTheDocument();
  });

  test('successful phone verification triggers email OTP and navigation', async () => {
    mockAuthClient.verifyPhoneOtp.mockResolvedValueOnce({ ok: true });
    mockAuthClient.requestEmailOtp.mockResolvedValueOnce({ ok: true });

    render(<PhoneRegistration />);

    fireEvent.change(screen.getByTestId('otp-input'), {
      target: { value: '123456' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));
    });

    await act(async () => {});

    expect(mockAuthClient.requestEmailOtp).toHaveBeenCalled();

    expect(navigate).toHaveBeenCalledWith('/verifyEmailOTP');
  });

  test('back to login navigates correctly', () => {
    render(<PhoneRegistration />);

    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));

    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
