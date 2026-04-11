/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import Login from '@/views/Login';

import { useAuth } from '@/AuthProvider';
import { useInternalAuth } from '@/context/InternalAuthContext';
import { createFetchWithAuth } from '@/fetchWithAuth';
import { isPasskeySupported, isValidEmail, isValidPhoneNumber } from '@/utils';

import { useNavigate } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';

jest.mock('@/AuthProvider');
jest.mock('@/context/InternalAuthContext');
jest.mock('@/fetchWithAuth');
jest.mock('@/utils', () => ({
  isPasskeySupported: jest.fn(),
  isValidEmail: jest.fn(),
  isValidPhoneNumber: jest.fn(),
}));
jest.mock('@simplewebauthn/browser');
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
    <button onClick={props.onPhoneOtp}>PhoneOTP</button>
    <button onClick={props.onPasskeyRetry}>RetryPasskey</button>
  </div>
));

describe('Login', () => {
  const navigate = jest.fn();
  const validateToken = jest.fn();
  const mockFetch = jest.fn();

  beforeEach(() => {
    (useNavigate as jest.Mock).mockReturnValue(navigate);

    (useAuth as jest.Mock).mockReturnValue({
      apiHost: 'http://localhost',
      hasSignedInBefore: true,
      mode: 'web',
      login: () => jest.fn(),
    });

    (useInternalAuth as jest.Mock).mockReturnValue({
      validateToken,
    });

    (createFetchWithAuth as jest.Mock).mockReturnValue(mockFetch);

    (isPasskeySupported as jest.Mock).mockResolvedValue(false);

    (isValidEmail as jest.Mock).mockReturnValue(true);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(false);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success', mfaLogin: false }),
    });

    (startAuthentication as jest.Mock).mockResolvedValue({});

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
    const mockLogin = jest.fn().mockResolvedValueOnce({ ok: true });
    (useAuth as jest.Mock).mockReturnValue({
      apiHost: 'http://localhost',
      hasSignedInBefore: true,
      mode: 'web',
      login: mockLogin,
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
    (isPasskeySupported as jest.Mock).mockResolvedValue(false);

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

  test('magic link option navigates to magic link sent page', async () => {
    (isPasskeySupported as jest.Mock).mockResolvedValue(false);

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

    expect(navigate).toHaveBeenCalledWith('/magiclinks-sent');
  });

  test('phone OTP option navigates to verify phone', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(false);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(true);
    (isPasskeySupported as jest.Mock).mockResolvedValue(false);

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

    expect(navigate).toHaveBeenCalledWith('/verifyPhoneOTP');
  });

  test('register mode submits registration', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(true);

    mockFetch.mockResolvedValueOnce({
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

    expect(navigate).toHaveBeenCalledWith('/verifyPhoneOTP');
  });
});
