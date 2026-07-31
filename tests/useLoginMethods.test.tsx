/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { renderHook, waitFor } from '@testing-library/react';

import { useAuthClient } from '@/hooks/useAuthClient';
import { hasNonPasskeyLoginMethod, useLoginMethods } from '@/hooks/useLoginMethods';

const mockGetPublicSystemConfig = jest.fn();

jest.mock('@/hooks/useAuthClient');

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthClient as jest.Mock).mockReturnValue({
    getPublicSystemConfig: mockGetPublicSystemConfig,
  });
});

describe('useLoginMethods', () => {
  it('returns the methods the instance reports', async () => {
    mockGetPublicSystemConfig.mockResolvedValue({
      data: { loginMethods: ['passkey', 'phone_otp'] },
      error: null,
    });

    const { result } = renderHook(() => useLoginMethods());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.loginMethods).toEqual(['passkey', 'phone_otp']);
  });

  // Null is "unknown", never "none". A caller that treated a failed read as an
  // empty list would draw conclusions the server never sent.
  it('leaves the methods unknown when the read fails', async () => {
    mockGetPublicSystemConfig.mockResolvedValue({
      data: null,
      error: new Error('network'),
    });

    const { result } = renderHook(() => useLoginMethods());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.loginMethods).toBeNull();
  });

  it('leaves the methods unknown when the instance reports an empty list', async () => {
    mockGetPublicSystemConfig.mockResolvedValue({
      data: { loginMethods: [] },
      error: null,
    });

    const { result } = renderHook(() => useLoginMethods());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.loginMethods).toBeNull();
  });
});

describe('hasNonPasskeyLoginMethod', () => {
  it.each([
    ['another method is enabled', ['passkey', 'magic_link'], true],
    ['passkey is the only method', ['passkey'], false],
    ['the methods are unknown', null, false],
    ['the list is empty', [], false],
  ])('is %s', (_label, methods, expected) => {
    expect(hasNonPasskeyLoginMethod(methods as never)).toBe(expected);
  });
});
