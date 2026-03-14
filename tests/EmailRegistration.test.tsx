import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import EmailRegistration from '@/views/EmailRegistration';

import { useAuth } from '@/AuthProvider';
import { useInternalAuth } from '@/context/InternalAuthContext';
import { createFetchWithAuth } from '@/fetchWithAuth';
import { isPasskeySupported } from '@/utils';

import { useNavigate } from 'react-router-dom';

jest.mock('@/AuthProvider');
jest.mock('@/context/InternalAuthContext');
jest.mock('@/fetchWithAuth');
jest.mock('@/utils');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('EmailRegistration', () => {
  const navigate = jest.fn();
  const validateToken = jest.fn();
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();

    (useNavigate as jest.Mock).mockReturnValue(navigate);

    (useAuth as jest.Mock).mockReturnValue({
      apiHost: 'http://localhost',
      mode: 'web',
    });

    (useInternalAuth as jest.Mock).mockReturnValue({
      validateToken,
    });

    (createFetchWithAuth as jest.Mock).mockReturnValue(mockFetch);

    (isPasskeySupported as jest.Mock).mockResolvedValue(false);

    mockFetch.mockResolvedValue({ ok: true });
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

    fireEvent.change(screen.getByLabelText(/email verification code/i), {
      target: { value: '123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));

    expect(screen.getByText(/please enter a valid code/i)).toBeInTheDocument();
  });

  test('submits OTP and verifies email', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    render(<EmailRegistration />);

    fireEvent.change(screen.getByLabelText(/email verification code/i), {
      target: { value: '123456' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /verify & continue/i }));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/otp/verify-email-otp',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  test('resend email triggers API call', async () => {
    render(<EmailRegistration />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /resend code to email/i }));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/otp/generate-email-otp',
      expect.objectContaining({
        method: 'GET',
      })
    );
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
    (isPasskeySupported as jest.Mock).mockResolvedValue(true);
    mockFetch.mockResolvedValue({ ok: true });

    render(<EmailRegistration />);

    await waitFor(() => {
      expect(isPasskeySupported).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText(/email verification code/i), {
      target: { value: '123456' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));
    });

    await waitFor(() => {
      expect(isPasskeySupported).toHaveBeenCalled();
    });

    expect(navigate).toHaveBeenCalledWith('/registerPasskey');
  });

  test('successful verification logs in if passkeys not supported', async () => {
    (isPasskeySupported as jest.Mock).mockResolvedValue(false);
    mockFetch.mockResolvedValue({ ok: true });

    render(<EmailRegistration />);

    fireEvent.change(screen.getByLabelText(/email verification code/i), {
      target: { value: '123456' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));
    });

    await act(async () => {});

    expect(validateToken).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  test('back to login navigates to login page', () => {
    render(<EmailRegistration />);

    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));

    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
