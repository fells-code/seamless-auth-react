/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { renderHook } from '@testing-library/react';

import { useAuth } from '@/AuthProvider';
import { useAuthClient } from '@/hooks/useAuthClient';

jest.mock('@/AuthProvider');

describe('useAuthClient', () => {
  it('returns the client the provider session already drives', () => {
    const client = { login: jest.fn() };
    (useAuth as jest.Mock).mockReturnValue({
      apiHost: 'https://api.example.com',
      client,
    });

    const { result } = renderHook(() => useAuthClient());

    // The same instance, not a copy: in bearer transport the client holds the
    // sign-in in flight, and a second client would not see it.
    expect(result.current).toBe(client);
  });
});
