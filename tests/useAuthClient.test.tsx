/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { renderHook } from '@testing-library/react';

import { useAuth } from '@/AuthProvider';
import { createSeamlessAuthClient } from '@/client/createSeamlessAuthClient';
import { useAuthClient } from '@/hooks/useAuthClient';

jest.mock('@/AuthProvider');
jest.mock('@/client/createSeamlessAuthClient');

describe('useAuthClient', () => {
  it('creates a client from the current auth config', () => {
    const client = { login: jest.fn() };
    (useAuth as jest.Mock).mockReturnValue({
      apiHost: 'https://api.example.com',
      mode: 'server',
    });
    (createSeamlessAuthClient as jest.Mock).mockReturnValue(client);

    const { result } = renderHook(() => useAuthClient());

    expect(createSeamlessAuthClient).toHaveBeenCalledWith({
      apiHost: 'https://api.example.com',
      mode: 'server',
    });
    expect(result.current).toBe(client);
  });
});
