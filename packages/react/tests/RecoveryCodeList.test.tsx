/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';

import RecoveryCodeList from '@/components/RecoveryCodeList';
import { useAuthClient } from '@/hooks/useAuthClient';
import { useRecoveryOptions } from '@/hooks/useRecoveryOptions';

jest.mock('@/hooks/useAuthClient');

describe('RecoveryCodeList', () => {
  const writeText = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    URL.createObjectURL = jest.fn(() => 'blob:codes');
    URL.revokeObjectURL = jest.fn();
  });

  it('copies the codes', async () => {
    writeText.mockResolvedValueOnce(undefined);
    render(<RecoveryCodeList codes={['A', 'B']} onDone={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Copied');
    expect(writeText).toHaveBeenCalledWith('A\nB');
  });

  it('says when copying is not available', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    render(<RecoveryCodeList codes={['A']} onDone={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/Write the codes down/);
  });

  it('downloads the codes as a text file', () => {
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    render(<RecoveryCodeList codes={['A']} onDone={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:codes');
    click.mockRestore();
  });
});

describe('useRecoveryOptions', () => {
  it('reads the recovery paths from the public configuration', async () => {
    (useAuthClient as jest.Mock).mockReturnValue({
      getPublicSystemConfig: jest.fn().mockResolvedValue({
        data: { loginMethods: ['passkey'], recoveryCodes: true },
        error: null,
      }),
    });

    const { result, unmount } = renderHook(() => useRecoveryOptions());

    expect(result.current).toEqual({
      recoveryCodes: false,
      accountRecovery: false,
      loading: true,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toEqual({
      recoveryCodes: true,
      accountRecovery: false,
      loading: false,
    });
    unmount();
  });

  it('ignores an answer that arrives after unmounting', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    (useAuthClient as jest.Mock).mockReturnValue({
      getPublicSystemConfig: jest.fn(() => new Promise(r => (resolve = r))),
    });

    const { result, unmount } = renderHook(() => useRecoveryOptions());
    unmount();
    resolve({ data: { loginMethods: [], accountRecovery: true }, error: null });
    await Promise.resolve();

    expect(result.current.accountRecovery).toBe(false);
  });
});
