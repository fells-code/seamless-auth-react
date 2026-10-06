/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, act } from '@testing-library/react';
import { StrictMode } from 'react';
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
  const signedIn = { data: { user: { id: 'user-1' } }, error: null };
  const signedOut = { data: null, error: new Error('unauthenticated') };
  const refreshSession = jest.fn();
  const mockAuthClient = {
    verifyMagicLink: jest.fn(),
    checkMagicLink: jest.fn(),
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
    refreshSession.mockResolvedValue(signedIn);
    mockAuthClient.checkMagicLink.mockResolvedValue({
      data: { message: 'Success' },
      error: null,
    });
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
      data: null,
      error: new Error('nope'),
    });

    render(<VerifyMagicLink />);

    expect(await screen.findByText(/failed to verify token/i)).toBeInTheDocument();
  });

  test('successful verification shows success message', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockAuthClient.verifyMagicLink.mockResolvedValue({
      data: { message: 'Success' },
      error: null,
    });

    render(<VerifyMagicLink />);

    expect(await screen.findByText(/login verified/i)).toBeInTheDocument();
  });

  test('broadcasts login success message', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockAuthClient.verifyMagicLink.mockResolvedValue({
      data: { message: 'Success' },
      error: null,
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
      data: { message: 'Success' },
      error: null,
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
      data: { message: 'Success' },
      error: null,
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
      data: null,
      error: new Error('nope'),
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
      data: { message: 'Success' },
      error: null,
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

  // Strict Mode runs the effect twice in development. The link is single use,
  // so a second request is refused, and that refusal used to be what the
  // screen reported.
  test('spends the link once under Strict Mode and signs in', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    let used = false;
    mockAuthClient.verifyMagicLink.mockImplementation(async () => {
      if (used) return { data: null, error: new Error('already used') };
      used = true;
      return { data: { message: 'Success' }, error: null };
    });

    render(
      <StrictMode>
        <VerifyMagicLink />
      </StrictMode>
    );

    expect(await screen.findByText(/login verified\. redirecting/i)).toBeInTheDocument();
    expect(mockAuthClient.verifyMagicLink).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/failed to verify token/i)).not.toBeInTheDocument();
  });

  test('does not ask for another session when this browser already has one', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);
    mockAuthClient.verifyMagicLink.mockResolvedValue({
      data: { message: 'Success' },
      error: null,
    });

    render(<VerifyMagicLink />);

    await screen.findByText(/login verified\. redirecting/i);
    expect(mockAuthClient.checkMagicLink).not.toHaveBeenCalled();
  });

  // Verifying does not sign in this tab; the session is collected with the
  // pre-auth cookie of the browser that asked for the link.
  test('collects the session when the link was opened in the requesting browser', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);
    mockAuthClient.verifyMagicLink.mockResolvedValue({
      data: { message: 'Success' },
      error: null,
    });
    refreshSession.mockResolvedValueOnce(signedOut).mockResolvedValueOnce(signedIn);

    render(<VerifyMagicLink />);

    await screen.findByText(/login verified\. redirecting/i);
    expect(mockAuthClient.checkMagicLink).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(900);
    });
    expect(navigate).toHaveBeenCalledWith('/');
  });

  test('sends the reader back when the link was opened on another device', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);
    mockAuthClient.verifyMagicLink.mockResolvedValue({
      data: { message: 'Success' },
      error: null,
    });
    mockAuthClient.checkMagicLink.mockResolvedValue({
      data: null,
      error: new Error('unauthenticated'),
    });
    refreshSession.mockResolvedValue(signedOut);

    render(<VerifyMagicLink />);

    expect(
      await screen.findByText(/return to the device where you requested this link/i)
    ).toBeInTheDocument();
    expect(postMessage).toHaveBeenCalledWith({ type: 'MAGIC_LINK_AUTH_SUCCESS' });

    act(() => {
      jest.advanceTimersByTime(900);
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  test('reads the session in the background so the application keeps this screen mounted', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);
    mockAuthClient.verifyMagicLink.mockResolvedValue({
      data: { message: 'Success' },
      error: null,
    });

    render(<VerifyMagicLink />);

    await screen.findByText(/login verified\. redirecting/i);
    expect(refreshSession).toHaveBeenCalledWith({ background: true });
  });

  test('shows spinner during verification', () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockAuthClient.verifyMagicLink.mockResolvedValue({
      data: { message: 'Success' },
      error: null,
    });

    render(<VerifyMagicLink />);

    expect(screen.getByText(/please wait while we securely verify/i)).toBeInTheDocument();
  });
});
