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
  useHref: jest.fn((to: string) => to),
}));

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
      login: jest.fn().mockResolvedValue({ data: {}, error: null }),
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
      data: { message: 'Success' },
      error: null,
    });
    mockAuthClient.requestMagicLink.mockResolvedValue({
      data: { message: 'Success' },
      error: null,
    });
    mockAuthClient.requestPhoneOtp.mockResolvedValue({
      data: { message: 'Success' },
      error: null,
    });
    mockAuthClient.requestLoginPhoneOtp.mockResolvedValue({
      data: { message: 'Success' },
      error: null,
    });
    mockAuthClient.requestLoginEmailOtp.mockResolvedValue({
      data: { message: 'Success' },
      error: null,
    });

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
      data: { loginMethods: ['passkey', 'magic_link'] },
      error: null,
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
      data: { loginMethods: ['magic_link', 'email_otp'] },
      error: null,
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

    expect(navigate).toHaveBeenCalledWith('/magic-link-sent', {
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
    expect(navigate).toHaveBeenCalledWith('/verify-phone-otp', {
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
    expect(navigate).toHaveBeenCalledWith('/verify-email-otp', {
      state: { flow: 'login' },
    });
  });

  test('register mode submits with only an email', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);

    mockAuthClient.register.mockResolvedValueOnce({
      data: { message: 'Success' },
      error: null,
    });

    render(<Login />);

    fireEvent.click(screen.getByText(/don't have an account/i));

    // Registration collects only an email; there is no phone field to fill.
    expect(screen.queryByTestId('phone-input')).toBeNull();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
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

    expect(mockAuthClient.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' })
    );
    expect(mockAuthClient.register.mock.calls[0][0]).not.toHaveProperty('phone');
    expect(navigate).toHaveBeenCalledWith('/verify-email-otp');
  });
});
