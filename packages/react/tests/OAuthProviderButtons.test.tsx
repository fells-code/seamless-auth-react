/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OAuthProviderButtons from '@/components/OAuthProviderButtons';

import { useAuth } from '@/AuthProvider';

jest.mock('@/AuthProvider');

const renderInRouter = (basename?: string) =>
  render(
    <MemoryRouter basename={basename} initialEntries={[basename ?? '/']}>
      <OAuthProviderButtons />
    </MemoryRouter>
  );

describe('OAuthProviderButtons', () => {
  const listOAuthProviders = jest.fn();
  const startOAuthLogin = jest.fn();
  const finishOAuthLogin = jest.fn();
  const open = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    open.mockResolvedValue({ type: 'navigated' });
    (useAuth as jest.Mock).mockReturnValue({
      listOAuthProviders,
      startOAuthLogin,
      finishOAuthLogin,
      ports: { oauthRedirect: { open } },
    });
  });

  test('renders nothing when no providers are configured', async () => {
    listOAuthProviders.mockResolvedValue({ data: { providers: [] }, error: null });

    const { container } = renderInRouter();

    await waitFor(() => expect(listOAuthProviders).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test('starts the flow and stores the provider when one is selected', async () => {
    listOAuthProviders.mockResolvedValue({
      data: { providers: [{ id: 'mock', name: 'Mock OIDC', scopes: [] }] },
      error: null,
    });
    startOAuthLogin.mockResolvedValue({
      data: { authorizationUrl: 'http://idp.test/authorize' },
      error: null,
    });

    renderInRouter();

    const button = await screen.findByRole('button', { name: /Continue with Mock OIDC/ });
    fireEvent.click(button);

    await waitFor(() =>
      expect(startOAuthLogin).toHaveBeenCalledWith({
        providerId: 'mock',
        redirectUri: `${window.location.origin}/oauth/callback`,
      })
    );
    expect(window.sessionStorage.getItem('seamless:oauth:provider')).toBe('mock');
  });

  test('includes the router basename in the callback redirect URI', async () => {
    listOAuthProviders.mockResolvedValue({
      data: { providers: [{ id: 'mock', name: 'Mock OIDC', scopes: [] }] },
      error: null,
    });
    startOAuthLogin.mockResolvedValue({
      data: { authorizationUrl: 'http://idp.test/authorize' },
      error: null,
    });

    renderInRouter('/app');

    const button = await screen.findByRole('button', { name: /Continue with Mock OIDC/ });
    fireEvent.click(button);

    await waitFor(() =>
      expect(startOAuthLogin).toHaveBeenCalledWith({
        providerId: 'mock',
        redirectUri: `${window.location.origin}/app/oauth/callback`,
      })
    );
  });

  test('opens the provider through the redirect port', async () => {
    listOAuthProviders.mockResolvedValue({
      data: { providers: [{ id: 'mock', name: 'Mock OIDC', scopes: [] }] },
      error: null,
    });
    startOAuthLogin.mockResolvedValue({
      data: { authorizationUrl: 'http://idp.test/authorize' },
      error: null,
    });

    renderInRouter();
    fireEvent.click(
      await screen.findByRole('button', { name: /Continue with Mock OIDC/ })
    );

    await waitFor(() =>
      expect(open).toHaveBeenCalledWith(
        'http://idp.test/authorize',
        `${window.location.origin}/oauth/callback`
      )
    );
    expect(finishOAuthLogin).not.toHaveBeenCalled();
  });

  test('finishes the login itself when the port hands the callback back', async () => {
    listOAuthProviders.mockResolvedValue({
      data: { providers: [{ id: 'mock', name: 'Mock OIDC', scopes: [] }] },
      error: null,
    });
    startOAuthLogin.mockResolvedValue({
      data: { authorizationUrl: 'http://idp.test/authorize' },
      error: null,
    });
    open.mockResolvedValue({ type: 'callback', code: 'c-1', state: 's-1' });
    finishOAuthLogin.mockResolvedValue({ data: {}, error: null });

    renderInRouter();
    fireEvent.click(
      await screen.findByRole('button', { name: /Continue with Mock OIDC/ })
    );

    await waitFor(() =>
      expect(finishOAuthLogin).toHaveBeenCalledWith({
        providerId: 'mock',
        code: 'c-1',
        state: 's-1',
      })
    );
  });
});
