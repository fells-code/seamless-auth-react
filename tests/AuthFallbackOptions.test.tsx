import { render, screen, fireEvent } from '@testing-library/react';
import AuthFallbackOptions from '@/components/AuthFallbackOptions';

import { isValidEmail, isValidPhoneNumber } from '@/utils';

jest.mock('@/utils', () => ({
  isValidEmail: jest.fn(),
  isValidPhoneNumber: jest.fn(),
}));

describe('AuthFallbackOptions', () => {
  const magicLinkHandler = jest.fn();
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
        onPhoneOtp={phoneOtpHandler}
        onPasskeyRetry={passkeyHandler}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /text message code/i }));

    expect(phoneOtpHandler).toHaveBeenCalledTimes(1);
  });

  test('always renders passkey retry option', () => {
    (isValidEmail as jest.Mock).mockReturnValue(false);
    (isValidPhoneNumber as jest.Mock).mockReturnValue(false);

    render(
      <AuthFallbackOptions
        identifier="anything"
        onMagicLink={magicLinkHandler}
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
        onPhoneOtp={phoneOtpHandler}
        onPasskeyRetry={passkeyHandler}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /try passkey anyway/i }));

    expect(passkeyHandler).toHaveBeenCalledTimes(1);
  });
});
