/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import Login from '@/views/Login';

import { useAuth } from '@/AuthProvider';
import { useAuthClient } from '@/hooks/useAuthClient';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import { isValidEmail, isValidPhoneNumber } from '@/utils';

import { useNavigate } from 'react-router-dom';

jest.mock('@/AuthProvider');
jest.mock('@/hooks/useAuthClient');
jest.mock('@/hooks/usePasskeySupport');
jest.mock('@/utils', () => ({
  isValidEmail: jest.fn(),
  isValidPhoneNumber: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('@/components/phoneInput', () => (props: any) => (
  <input
    data-testid="phone-input"
    value={props.phone}
    onChange={e => props.setPhone(e.target.value)}
  />
));

jest.mock('@/components/AuthFallbackOptions', () => (props: any) => (
  <div data-testid="fallback-options">
    <button onClick={props.onMagicLink}>MagicLink</button>
    <button onClick={props.onEmailOtp}>EmailOTP</button>
    <button onClick={props.onPhoneOtp}>PhoneOTP</button>
    <button onClick={props.onPasskeyRetry}>RetryPasskey</button>
    <span data-testid="fallback-methods">{props.loginMethods?.join(',')}</span>
  </div>
));

describe('Login', () => {
  const navigate = jest.fn();
  const mockAuthClient = {
    register: jest.fn(),
    requestMagicLink: jest.fn(),
    requestPhoneOtp: jest.fn(),
    requestLoginPhoneOtp: jest.fn(),
    requestLoginEmailOtp: jest.fn(),
  };

  beforeEach(() => {
    (useNavigate as jest.Mock).mockReturnValue(navigate);

    (useAuth as jest.Mock).mockReturnValue({
      apiHost: 'http://localhost',
      hasSignedInBefore: true,
      listOAuthProviders: jest.fn().mockResolvedValue({ providers: [] }),
      login: jest.fn().mockResolvedValue({ ok: true }),
      handlePasskeyLogin: jest.fn().mockResolvedValue(false),
    });

    (useAuthClient as jest.Mock).mockReturnValue(mockAuthClient);
    (usePasskeySupport as jest.Mock).mockReturnValue({
      passkeySupported: false,
      loading: false,
    });

    (isValidEmail as jest.Mock).mockReturnValue(true);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(false);

    mockAuthClient.register.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success', mfaLogin: false }),
    });
    mockAuthClient.requestMagicLink.mockResolvedValue({ ok: true });
    mockAuthClient.requestPhoneOtp.mockResolvedValue({ ok: true });
    mockAuthClient.requestLoginPhoneOtp.mockResolvedValue({ ok: true });
    mockAuthClient.requestLoginEmailOtp.mockResolvedValue({ ok: true });

    jest.clearAllMocks();
  });

  test('renders login form when user has signed in before', async () => {
    render(<Login />);

    expect(await screen.findByText(/sign in/i)).toBeInTheDocument();
  });

  test('shows validation error on invalid identifier', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(false);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(false);

    render(<Login />);

    const input = screen.getByPlaceholderText(/email or phone number/i);

    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.blur(input);

    expect(
      await screen.findByText(/please enter a valid email or phone number/i)
    ).toBeInTheDocument();
  });

  test('login triggers API request', async () => {
    const mockLogin = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ loginMethods: ['passkey', 'magic_link'] }),
    });
    const mockHandlePasskeyLogin = jest.fn().mockResolvedValue(false);
    (useAuth as jest.Mock).mockReturnValue({
      apiHost: 'http://localhost',
      hasSignedInBefore: true,
      listOAuthProviders: jest.fn().mockResolvedValue({ providers: [] }),
      login: mockLogin,
      handlePasskeyLogin: mockHandlePasskeyLogin,
    });
    render(<Login />);

    const input = screen.getByPlaceholderText(/email or phone number/i);

    fireEvent.change(input, {
      target: { value: 'test@example.com' },
    });

    const loginButton = await screen.findByRole('button', { name: /login/i });

    await waitFor(() => {
      expect(loginButton).toBeEnabled();
    });

    await act(async () => {
      fireEvent.click(loginButton);
    });

    expect(mockLogin).toHaveBeenCalled();
  });

  test('fallback options appear if passkeys unavailable', async () => {
    render(<Login />);

    const input = screen.getByPlaceholderText(/email or phone number/i);

    fireEvent.change(input, { target: { value: 'test@example.com' } });

    const loginButton = await screen.findByRole('button', { name: /login/i });

    await waitFor(() => {
      expect(loginButton).toBeEnabled();
    });

    fireEvent.click(loginButton);

    expect(await screen.findByTestId('fallback-options')).toBeInTheDocument();
  });

  test('passes login methods from login start response into fallback options', async () => {
    const mockLogin = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ loginMethods: ['magic_link', 'email_otp'] }),
    });
    (useAuth as jest.Mock).mockReturnValue({
      apiHost: 'http://localhost',
      hasSignedInBefore: true,
      listOAuthProviders: jest.fn().mockResolvedValue({ providers: [] }),
      login: mockLogin,
      handlePasskeyLogin: jest.fn().mockResolvedValue(false),
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/email or phone number/i), {
      target: { value: 'test@example.com' },
    });

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /login/i }));
    });

    expect(await screen.findByTestId('fallback-methods')).toHaveTextContent(
      'magic_link,email_otp'
    );
  });

  test('magic link option navigates to magic link sent page', async () => {
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/email or phone number/i), {
      target: { value: 'test@example.com' },
    });

    const loginButton = await screen.findByRole('button', { name: /login/i });

    await act(async () => {
      fireEvent.click(loginButton);
    });

    const magicLink = await screen.findByText('MagicLink');

    await act(async () => {
      fireEvent.click(magicLink);
    });

    expect(navigate).toHaveBeenCalledWith('/magiclinks-sent', {
      state: { identifier: 'test@example.com' },
    });
  });

  test('phone OTP option navigates to verify phone', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(false);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(true);

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/email or phone number/i), {
      target: { value: '+15555555555' },
    });

    const loginButton = await screen.findByRole('button', { name: /login/i });

    await act(async () => {
      fireEvent.click(loginButton);
    });

    const phoneOtp = await screen.findByText('PhoneOTP');

    await act(async () => {
      fireEvent.click(phoneOtp);
    });

    expect(mockAuthClient.requestLoginPhoneOtp).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/verifyPhoneOTP', {
      state: { flow: 'login' },
    });
  });

  test('email OTP option navigates to verify email for login flow', async () => {
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/email or phone number/i), {
      target: { value: 'test@example.com' },
    });

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /login/i }));
    });

    const emailOtp = await screen.findByText('EmailOTP');

    await act(async () => {
      fireEvent.click(emailOtp);
    });

    expect(mockAuthClient.requestLoginEmailOtp).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/verifyEmailOTP', {
      state: { flow: 'login' },
    });
  });

  test('register mode submits registration', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(true);

    mockAuthClient.register.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Success' }),
    });

    render(<Login />);

    fireEvent.click(screen.getByText(/don't have an account/i));

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });

    fireEvent.change(screen.getByTestId('phone-input'), {
      target: { value: '+15555555555' },
    });

    const registerButton = await screen.findByRole('button', {
      name: /register/i,
    });

    await waitFor(() => {
      expect(registerButton).toBeEnabled();
    });

    await act(async () => {
      fireEvent.click(registerButton);
    });

    expect(navigate).toHaveBeenCalledWith('/verifyEmailOTP');
  });
});
