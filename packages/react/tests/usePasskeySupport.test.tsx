/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { renderHook, waitFor } from '@testing-library/react';

import { useAuth } from '@/AuthProvider';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';

jest.mock('@/AuthProvider');

function mockPorts(passkeys: {
  isSupported?: () => boolean;
  isPlatformAuthenticatorAvailable?: () => Promise<boolean>;
}) {
  (useAuth as jest.Mock).mockReturnValue({
    ports: {
      passkeys: {
        isSupported: passkeys.isSupported ?? (() => true),
        isPlatformAuthenticatorAvailable:
          passkeys.isPlatformAuthenticatorAvailable ?? (async () => true),
        create: jest.fn(),
        get: jest.fn(),
      },
    },
  });
}

describe('usePasskeySupport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports support when the port has a platform authenticator', async () => {
    mockPorts({});

    const { result } = renderHook(() => usePasskeySupport());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.passkeySupported).toBe(true);
  });

  it('reports unsupported when the platform cannot run WebAuthn at all', async () => {
    const isPlatformAuthenticatorAvailable = jest.fn(async () => true);
    mockPorts({ isSupported: () => false, isPlatformAuthenticatorAvailable });

    const { result } = renderHook(() => usePasskeySupport());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.passkeySupported).toBe(false);
    // No point asking for an authenticator on a platform without WebAuthn.
    expect(isPlatformAuthenticatorAvailable).not.toHaveBeenCalled();
  });

  it('reports unsupported when the capability check fails', async () => {
    mockPorts({
      isPlatformAuthenticatorAvailable: async () => {
        throw new Error('unsupported');
      },
    });

    const { result } = renderHook(() => usePasskeySupport());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.passkeySupported).toBe(false);
  });
});
