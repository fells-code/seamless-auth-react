/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent, act } from '@testing-library/react';

import Login from '@/views/Login';
import MagicLinkSent from '@/components/MagicLinkSent';
import { useAuth } from '@/AuthProvider';
import { createFetchWithAuth } from '../../client/src/fetchWithAuth';
import { createSeamlessAuthClient } from '@seamless-auth/client';
import { useNavigate, useLocation } from 'react-router-dom';

// `useAuthClient` and the client itself stay real here: the whole point is that
// the destination survives the trip from provider config into the request body.
// The provider is mocked, so the client it would have built is built here from
// the same config.
jest.mock('@/AuthProvider');
jest.mock('../../client/src/fetchWithAuth');
jest.mock('@/utils', () => ({
  isValidEmail: jest.fn(() => true),
  isValidPhoneNumber: jest.fn(() => false),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
  useHref: jest.fn((to: string) => to),
}));
jest.mock('@/components/AuthFallbackOptions', () => (props: any) => (
  <button onClick={props.onMagicLink}>MagicLink</button>
));

const REDIRECT_URI = 'https://app.example.com/auth/magic';

const noPasskeys = {
  isSupported: () => false,
  isPlatformAuthenticatorAvailable: async () => false,
  create: jest.fn(),
  get: jest.fn(),
};

const authContext = (magicLinkRedirectUri: string | undefined) => ({
  apiHost: 'https://api.example.com',
  magicLinkRedirectUri,
  client: createSeamlessAuthClient({
    apiHost: 'https://api.example.com',
    magicLinkRedirectUri,
    passkeys: noPasskeys,
  }),
  ports: { passkeys: noPasskeys },
  hasSignedInBefore: true,
  refreshSession: jest.fn(),
  listOAuthProviders: jest.fn().mockResolvedValue({ providers: [] }),
  login: jest.fn().mockResolvedValue({ data: {}, error: null }),
  handlePasskeyLogin: jest.fn().mockResolvedValue(false),
});

const mockFetchWithAuth = jest.fn();

/** The body of every POST the client made to /magic-link, in order. */
const magicLinkBodies = (): string[] =>
  mockFetchWithAuth.mock.calls
    .filter(([path]) => path === '/magic-link')
    .map(([, init]) => init.body);

describe('magic link destination in the bundled views', () => {
  beforeEach(() => {
    (createFetchWithAuth as jest.Mock).mockReturnValue(mockFetchWithAuth);
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success' }),
    });

    (useNavigate as jest.Mock).mockReturnValue(jest.fn());
    (useLocation as jest.Mock).mockReturnValue({
      state: { identifier: 'test@example.com' },
    });

    (useAuth as jest.Mock).mockReturnValue(authContext(REDIRECT_URI));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const sendFromLogin = async () => {
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/email or phone number/i), {
      target: { value: 'test@example.com' },
    });

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /^login$/i }));
    });

    await act(async () => {
      fireEvent.click(await screen.findByText('MagicLink'));
    });
  };

  const resendFromMagicLinkSent = async () => {
    jest.useFakeTimers();
    try {
      render(<MagicLinkSent />);

      // The resend button is on a 30s cooldown from mount.
      act(() => {
        jest.advanceTimersByTime(30_000);
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /resend/i }));
      });
    } finally {
      jest.useRealTimers();
    }
  };

  it('sends the configured destination from the sign-in screen', async () => {
    await sendFromLogin();

    expect(magicLinkBodies()).toEqual([JSON.stringify({ redirectUri: REDIRECT_URI })]);
  });

  // The trap this option exists to avoid: a resend that lands somewhere other
  // than the link it repeats. Both views must reach the same destination.
  it('resends to the same destination the first link used', async () => {
    await sendFromLogin();
    await resendFromMagicLinkSent();

    const [first, resent] = magicLinkBodies();

    expect(resent).toBe(first);
    expect(resent).toBe(JSON.stringify({ redirectUri: REDIRECT_URI }));
  });

  it('falls back to the deployment destination when none is configured', async () => {
    (useAuth as jest.Mock).mockReturnValue(authContext(undefined));

    await sendFromLogin();
    await resendFromMagicLinkSent();

    expect(magicLinkBodies()).toEqual([JSON.stringify({}), JSON.stringify({})]);
  });
});
