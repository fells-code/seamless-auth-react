/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, act } from '@testing-library/react';
import VerifyMagicLink from '@/views/VerifyMagicLink';

import { useAuthClient } from '@/hooks/useAuthClient';

import { useNavigate, useSearchParams } from 'react-router-dom';

jest.mock('@/hooks/useAuthClient');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('VerifyMagicLink', () => {
  const navigate = jest.fn();
  const mockAuthClient = {
    verifyMagicLink: jest.fn(),
  };
  const postMessage = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();

    (useNavigate as jest.Mock).mockReturnValue(navigate);
    (useAuthClient as jest.Mock).mockReturnValue(mockAuthClient);

    global.BroadcastChannel = jest.fn(() => ({
      postMessage,
      close: jest.fn(),
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
