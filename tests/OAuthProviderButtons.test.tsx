/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OAuthProviderButtons from '@/components/OAuthProviderButtons';

import { useAuth } from '@/AuthProvider';

jest.mock('@/AuthProvider');

describe('OAuthProviderButtons', () => {
  const listOAuthProviders = jest.fn();
  const startOAuthLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    (useAuth as jest.Mock).mockReturnValue({ listOAuthProviders, startOAuthLogin });
  });

  test('renders nothing when no providers are configured', async () => {
    listOAuthProviders.mockResolvedValue({ providers: [] });

    const { container } = render(<OAuthProviderButtons />);

    await waitFor(() => expect(listOAuthProviders).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test('starts the flow and stores the provider when one is selected', async () => {
    listOAuthProviders.mockResolvedValue({
      providers: [{ id: 'mock', name: 'Mock OIDC', scopes: [] }],
    });
    startOAuthLogin.mockResolvedValue({ authorizationUrl: 'http://idp.test/authorize' });

    render(<OAuthProviderButtons />);

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
});
