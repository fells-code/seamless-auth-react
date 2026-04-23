/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { renderHook, waitFor } from '@testing-library/react';

import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import { isPasskeySupported } from '@/utils';

jest.mock('@/utils', () => ({
  isPasskeySupported: jest.fn(),
}));

describe('usePasskeySupport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports support when passkeys are available', async () => {
    (isPasskeySupported as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => usePasskeySupport());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.passkeySupported).toBe(true);
  });

  it('reports unsupported when the capability check fails', async () => {
    (isPasskeySupported as jest.Mock).mockRejectedValue(new Error('unsupported'));

    const { result } = renderHook(() => usePasskeySupport());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.passkeySupported).toBe(false);
  });
});
