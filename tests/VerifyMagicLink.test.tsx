import { render, screen, act } from '@testing-library/react';
import VerifyMagicLink from '@/views/VerifyMagicLink';

import { useAuth } from '@/AuthProvider';
import { createFetchWithAuth } from '@/fetchWithAuth';

import { useNavigate, useSearchParams } from 'react-router-dom';

jest.mock('@/AuthProvider');
jest.mock('@/fetchWithAuth');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('VerifyMagicLink', () => {
  const navigate = jest.fn();
  const mockFetch = jest.fn();
  const postMessage = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();

    (useNavigate as jest.Mock).mockReturnValue(navigate);

    (useAuth as jest.Mock).mockReturnValue({
      apiHost: 'http://localhost',
      mode: 'web',
    });

    (createFetchWithAuth as jest.Mock).mockReturnValue(mockFetch);

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

    mockFetch.mockResolvedValue({
      ok: false,
    });

    render(<VerifyMagicLink />);

    expect(await screen.findByText(/failed to verify token/i)).toBeInTheDocument();
  });

  test('successful verification shows success message', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockFetch.mockResolvedValue({
      ok: true,
    });

    render(<VerifyMagicLink />);

    expect(await screen.findByText(/login verified/i)).toBeInTheDocument();
  });

  test('broadcasts login success message', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('?token=abc123'),
    ]);

    mockFetch.mockResolvedValue({
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

    mockFetch.mockResolvedValue({
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

    mockFetch.mockResolvedValue({
      ok: true,
    });

    render(<VerifyMagicLink />);

    expect(screen.getByText(/please wait while we securely verify/i)).toBeInTheDocument();
  });
});
