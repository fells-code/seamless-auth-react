/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import PhoneRegistration from '@/views/PhoneRegistration';

import { useAuth } from '@/AuthProvider';
import { createFetchWithAuth } from '@/fetchWithAuth';
import { useNavigate } from 'react-router-dom';

jest.mock('@/AuthProvider');
jest.mock('@/fetchWithAuth');
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
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();

    (useNavigate as jest.Mock).mockReturnValue(navigate);

    (useAuth as jest.Mock).mockReturnValue({
      apiHost: 'http://localhost',
      mode: 'web',
    });

    (createFetchWithAuth as jest.Mock).mockReturnValue(mockFetch);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
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

    expect(mockFetch).toHaveBeenCalledWith(
      '/otp/verify-phone-otp',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  test('resend SMS triggers API call', async () => {
    render(<PhoneRegistration />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /resend code to phone/i }));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/otp/generate-phone-otp',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  test('resend stores token if returned', async () => {
    mockFetch.mockResolvedValueOnce({
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
    mockFetch
      .mockResolvedValueOnce({ ok: true }) // verify phone
      .mockResolvedValueOnce({ ok: true }); // generate email otp

    render(<PhoneRegistration />);

    fireEvent.change(screen.getByTestId('otp-input'), {
      target: { value: '123456' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));
    });

    await act(async () => {});

    expect(mockFetch).toHaveBeenCalledWith('/otp/generate-email-otp', expect.any(Object));

    expect(navigate).toHaveBeenCalledWith('/verifyEmailOTP');
  });

  test('back to login navigates correctly', () => {
    render(<PhoneRegistration />);

    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));

    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
