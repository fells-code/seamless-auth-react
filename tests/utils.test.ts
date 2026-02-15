import {
  isValidEmail,
  isValidPhoneNumber,
  isPasskeySupported,
  parseUserAgent,
} from '../src/utils';

jest.mock('libphonenumber-js', () => ({
  __esModule: true,
  default: jest.fn((phone: string) => {
    if (phone === '+15551234567') {
      return { isValid: () => true };
    }
    if (phone === '5551234') {
      return { isValid: () => false };
    }
    return undefined;
  }),
  parsePhoneNumberFromString: jest.fn(),
}));

describe('isValidEmail', () => {
  it('returns true for valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('first.last@domain.co')).toBe(true);
    expect(isValidEmail('my_email+alias@sub.domain.io')).toBe(true);
  });

  it('returns false for invalid emails', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('missing@dot')).toBe(false);
    expect(isValidEmail('@nouser.com')).toBe(false);
    expect(isValidEmail('user@.com')).toBe(false);
    expect(isValidEmail('user@domain.')).toBe(false);
    expect(isValidEmail('user@domain..com')).toBe(false);
    expect(isValidEmail('.user@domain.com')).toBe(false);
    expect(isValidEmail('user.@domain.com')).toBe(false);
  });

  it('handles edge cases', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('a@b.c')).toBe(false); // too short domain
    expect(isValidEmail('a'.repeat(321) + '@test.com')).toBe(false); // too long
    // @ts-expect-error deliberate invalid type
    expect(isValidEmail(12345)).toBe(false);
  });
});

describe('isValidPhoneNumber', () => {
  it('returns true for valid phone number', () => {
    expect(isValidPhoneNumber('+15551234567')).toBe(true);
  });

  it('returns false for invalid phone number', () => {
    expect(isValidPhoneNumber('5551234')).toBe(false);
  });

  it('returns false if parsing fails', () => {
    expect(isValidPhoneNumber('not-a-number')).toBe(false);
  });
});

describe('isPasskeySupported', () => {
  const originalPublicKeyCredential = (global as any).PublicKeyCredential;

  afterEach(() => {
    (global as any).PublicKeyCredential = originalPublicKeyCredential;
    jest.resetAllMocks();
  });

  it('returns true when platform authenticator is available', async () => {
    const mockIsAvailable = jest.fn().mockResolvedValue(true);
    (global as any).PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: mockIsAvailable,
    };
    await expect(isPasskeySupported()).resolves.toBe(true);
    expect(mockIsAvailable).toHaveBeenCalled();
  });

  it('returns false when not available', async () => {
    (global as any).PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: jest.fn().mockResolvedValue(false),
    };
    await expect(isPasskeySupported()).resolves.toBe(false);
  });

  it('returns false if PublicKeyCredential is missing', async () => {
    delete (global as any).PublicKeyCredential;
    await expect(isPasskeySupported()).resolves.toBe(false);
  });

  it('returns false if check throws', async () => {
    const mockThrowing = jest.fn().mockRejectedValue(new Error('test error'));
    (global as any).PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: mockThrowing,
    };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(isPasskeySupported()).resolves.toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error checking passkey support:'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});

describe('parseUserAgent', () => {
  const setUserAgent = (ua: string) => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: ua,
      configurable: true,
    });
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('detects iOS + Safari', () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile Safari/604.1'
    );

    const result = parseUserAgent();

    expect(result.platform).toBe('ios');
    expect(result.browser).toBe('safari');
    expect(result.deviceInfo).toBe('ios • safari');
  });

  it('detects Android + Chrome', () => {
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 13; Pixel) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'
    );

    const result = parseUserAgent();

    expect(result.platform).toBe('android');
    expect(result.browser).toBe('chrome');
    expect(result.deviceInfo).toBe('android • chrome');
  });

  it('detects macOS + Chrome', () => {
    setUserAgent(
      'Mozilla/5.0 (Mac OS X 13_0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'
    );

    const result = parseUserAgent();

    expect(result.platform).toBe('mac');
    expect(result.browser).toBe('chrome');
  });

  it('detects Windows + Edge', () => {
    setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Edg/120.0 Safari/537.36'
    );

    const result = parseUserAgent();

    expect(result.platform).toBe('windows');
    expect(result.browser).toBe('edge');
  });

  it('detects Linux + Firefox', () => {
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/120.0');

    const result = parseUserAgent();

    expect(result.platform).toBe('linux');
    expect(result.browser).toBe('firefox');
  });

  it('falls back to unknown when no match', () => {
    setUserAgent('SomeRandomAgentString');

    const result = parseUserAgent();

    expect(result.platform).toBe('unknown');
    expect(result.browser).toBe('unknown');
  });
});
