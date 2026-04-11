/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import MagicLinkSent from '@/components/MagicLinkSent';

import { useAuth } from '@/AuthProvider';
import { useInternalAuth } from '@/context/InternalAuthContext';
import { createFetchWithAuth } from '@/fetchWithAuth';

import { useNavigate, useLocation } from 'react-router-dom';

jest.mock('@/AuthProvider');
jest.mock('@/context/InternalAuthContext');
jest.mock('@/fetchWithAuth');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

describe('MagicLinkSent', () => {
  const navigate = jest.fn();
  const validateToken = jest.fn();
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();

    (useNavigate as jest.Mock).mockReturnValue(navigate);

    (useLocation as jest.Mock).mockReturnValue({
      state: { identifier: 'test@example.com' },
    });

    (useAuth as jest.Mock).mockReturnValue({
      apiHost: 'http://localhost',
      mode: 'web',
    });

    (useInternalAuth as jest.Mock).mockReturnValue({
      validateToken,
    });

    (createFetchWithAuth as jest.Mock).mockReturnValue(mockFetch);

    mockFetch.mockResolvedValue({ status: 200 });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('renders identifier from router state', () => {
    render(<MagicLinkSent />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  test('cooldown timer counts down', () => {
    render(<MagicLinkSent />);

    expect(screen.getByText(/available in 30s/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/available in 29s/i)).toBeInTheDocument();
  });

  test('resend button disabled during cooldown', () => {
    render(<MagicLinkSent />);

    const button = screen.getByRole('button', { name: /resend link/i });

    expect(button).toBeDisabled();
  });

  test('resend triggers request when cooldown reaches zero', async () => {
    render(<MagicLinkSent />);

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    const button = screen.getByRole('button', { name: /resend link/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockFetch).toHaveBeenCalledWith('/magic-link', expect.any(Object));
  });

  test('change email button navigates to login', () => {
    render(<MagicLinkSent />);

    fireEvent.click(screen.getByRole('button', { name: /change email or phone/i }));

    expect(navigate).toHaveBeenCalledWith('/login');
  });

  test('broadcast channel success triggers login', async () => {
    const close = jest.fn();

    let createdChannel: any;

    (global as any).BroadcastChannel = jest.fn().mockImplementation(() => {
      createdChannel = {
        onmessage: null,
        close,
      };

      return createdChannel;
    });

    mockFetch.mockResolvedValue({ status: 200 });

    render(<MagicLinkSent />);

    await act(async () => {
      await createdChannel.onmessage({
        data: { type: 'MAGIC_LINK_AUTH_SUCCESS' },
      });
    });

    expect(mockFetch).toHaveBeenCalledWith('/magic-link/check', expect.any(Object));
    expect(validateToken).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/');
  });

  test('polling success triggers login', async () => {
    render(<MagicLinkSent />);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockFetch).toHaveBeenCalledWith('/magic-link/check', expect.any(Object));

    expect(validateToken).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
