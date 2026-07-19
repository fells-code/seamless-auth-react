/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, act } from '@testing-library/react';
import VerifyMagicLink from '@/views/VerifyMagicLink';

import { useAuth } from '@/AuthProvider';
import { useAuthClient } from '@/hooks/useAuthClient';

import { useNavigate, useSearchParams } from 'react-router-dom';

jest.mock('@/hooks/useAuthClient');
jest.mock('@/AuthProvider');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('VerifyMagicLink', () => {
  const navigate = jest.fn();
  const refreshSession = jest.fn().mockResolvedValue(undefined);
  const mockAuthClient = {
    verifyMagicLink: jest.fn(),
  };
  const postMessage = jest.fn();
  const close = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();

    (useNavigate as jest.Mock).mockReturnValue(navigate);
    (useAuthClient as jest.Mock).mockReturnValue(mockAuthClient);
    (useAuth as jest.Mock).mockReturnValue({ refreshSession });

    global.BroadcastChannel = jest.fn(() => ({
      postMessage,
      close,
    })) as any;

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('shows error when token missing', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([new URLSearchParams()]);

    render(<VerifyMagicLink />);

    expect(
      await screen.findByText(/missing token for verification/i)
    ).toBeInTheDocument();
  });

  test('shows error when verification fails', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockAuthClient.verifyMagicLink.mockResolvedValue({
      ok: false,
    });

    render(<VerifyMagicLink />);

    expect(await screen.findByText(/failed to verify token/i)).toBeInTheDocument();
  });

  test('successful verification shows success message', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockAuthClient.verifyMagicLink.mockResolvedValue({
      ok: true,
    });

    render(<VerifyMagicLink />);

    expect(await screen.findByText(/login verified/i)).toBeInTheDocument();
  });

  test('broadcasts login success message', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockAuthClient.verifyMagicLink.mockResolvedValue({
      ok: true,
    });

    render(<VerifyMagicLink />);

    await screen.findByText(/login verified/i);

    expect(postMessage).toHaveBeenCalledWith({
      type: 'MAGIC_LINK_AUTH_SUCCESS',
    });
  });

  test('redirects after success timeout', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockAuthClient.verifyMagicLink.mockResolvedValue({
      ok: true,
    });

    render(<VerifyMagicLink />);

    await screen.findByText(/login verified/i);

    act(() => {
      jest.advanceTimersByTime(900);
    });

    expect(navigate).toHaveBeenCalledWith('/');
  });

  test('refreshes provider session on successful verification', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockAuthClient.verifyMagicLink.mockResolvedValue({
      ok: true,
    });

    render(<VerifyMagicLink />);

    await screen.findByText(/login verified/i);

    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  test('does not refresh session when verification fails', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockAuthClient.verifyMagicLink.mockResolvedValue({
      ok: false,
    });

    render(<VerifyMagicLink />);

    await screen.findByText(/failed to verify token/i);

    expect(refreshSession).not.toHaveBeenCalled();
  });

  test('cleans up broadcast channel and redirect timeout on unmount', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockAuthClient.verifyMagicLink.mockResolvedValue({
      ok: true,
    });

    const { unmount } = render(<VerifyMagicLink />);

    await screen.findByText(/login verified/i);

    unmount();

    expect(close).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);

    act(() => {
      jest.advanceTimersByTime(900);
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  test('shows spinner during verification', () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockAuthClient.verifyMagicLink.mockResolvedValue({
      ok: true,
    });

    render(<VerifyMagicLink />);

    expect(screen.getByText(/please wait while we securely verify/i)).toBeInTheDocument();
  });
});
