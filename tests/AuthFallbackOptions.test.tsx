/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent } from '@testing-library/react';
import AuthFallbackOptions from '@/components/AuthFallbackOptions';

import { isValidEmail, isValidPhoneNumber } from '@/utils';

jest.mock('@/utils', () => ({
  isValidEmail: jest.fn(),
  isValidPhoneNumber: jest.fn(),
}));

describe('AuthFallbackOptions', () => {
  const magicLinkHandler = jest.fn();
  const emailOtpHandler = jest.fn();
  const phoneOtpHandler = jest.fn();
  const passkeyHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders magic link option when identifier is an email', () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(false);

    render(
      <AuthFallbackOptions
        identifier="test@example.com"
        onMagicLink={magicLinkHandler}
        onEmailOtp={emailOtpHandler}
        onPhoneOtp={phoneOtpHandler}
        onPasskeyRetry={passkeyHandler}
      />
    );

    expect(screen.getByRole('button', { name: /email magic link/i })).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /text message code/i })
    ).not.toBeInTheDocument();
  });

  test('renders phone OTP option when identifier is a phone number', () => {
    (isValidEmail as jest.Mock).mockReturnValue(false);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(true);

    render(
      <AuthFallbackOptions
        identifier="+15555555555"
        onMagicLink={magicLinkHandler}
        onEmailOtp={emailOtpHandler}
        onPhoneOtp={phoneOtpHandler}
        onPasskeyRetry={passkeyHandler}
      />
    );

    expect(
      screen.getByRole('button', { name: /text message code/i })
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /email magic link/i })
    ).not.toBeInTheDocument();
  });

  test('calls magic link handler when magic link button is clicked', () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(false);

    render(
      <AuthFallbackOptions
        identifier="test@example.com"
        onMagicLink={magicLinkHandler}
        onEmailOtp={emailOtpHandler}
        onPhoneOtp={phoneOtpHandler}
        onPasskeyRetry={passkeyHandler}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /email magic link/i }));

    expect(magicLinkHandler).toHaveBeenCalledTimes(1);
  });

  test('calls phone OTP handler when phone button is clicked', () => {
    (isValidEmail as jest.Mock).mockReturnValue(false);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(true);

    render(
      <AuthFallbackOptions
        identifier="+15555555555"
        onMagicLink={magicLinkHandler}
        onEmailOtp={emailOtpHandler}
        onPhoneOtp={phoneOtpHandler}
        onPasskeyRetry={passkeyHandler}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /text message code/i }));

    expect(phoneOtpHandler).toHaveBeenCalledTimes(1);
  });

  test('renders and calls email OTP when enabled for an email identifier', () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(false);

    render(
      <AuthFallbackOptions
        identifier="test@example.com"
        onMagicLink={magicLinkHandler}
        onEmailOtp={emailOtpHandler}
        onPhoneOtp={phoneOtpHandler}
        onPasskeyRetry={passkeyHandler}
        loginMethods={['email_otp']}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /email code/i }));

    expect(emailOtpHandler).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: /email magic link/i })
    ).not.toBeInTheDocument();
  });

  test('filters fallback options using configured login methods', () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(false);

    render(
      <AuthFallbackOptions
        identifier="test@example.com"
        onMagicLink={magicLinkHandler}
        onEmailOtp={emailOtpHandler}
        onPhoneOtp={phoneOtpHandler}
        onPasskeyRetry={passkeyHandler}
        loginMethods={['magic_link']}
      />
    );

    expect(screen.getByRole('button', { name: /email magic link/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /email code/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /try passkey anyway/i })
    ).not.toBeInTheDocument();
  });

  test('always renders passkey retry option', () => {
    (isValidEmail as jest.Mock).mockReturnValue(false);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(false);

    render(
      <AuthFallbackOptions
        identifier="anything"
        onMagicLink={magicLinkHandler}
        onEmailOtp={emailOtpHandler}
        onPhoneOtp={phoneOtpHandler}
        onPasskeyRetry={passkeyHandler}
      />
    );

    expect(
      screen.getByRole('button', { name: /try passkey anyway/i })
    ).toBeInTheDocument();
  });

  test('calls passkey retry handler when clicked', () => {
    (isValidEmail as jest.Mock).mockReturnValue(false);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(false);

    render(
      <AuthFallbackOptions
        identifier="anything"
        onMagicLink={magicLinkHandler}
        onEmailOtp={emailOtpHandler}
        onPhoneOtp={phoneOtpHandler}
        onPasskeyRetry={passkeyHandler}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /try passkey anyway/i }));

    expect(passkeyHandler).toHaveBeenCalledTimes(1);
  });
});
