/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 *
 * @jest-environment node
 */

import { createAuthSession } from '@/session/createAuthSession';
import { createDefaultStorage } from '@/session/storage';

jest.mock('@/fetchWithAuth', () => ({
  createFetchWithAuth: () => jest.fn(),
}));

// Runs under the node environment, where `localStorage` genuinely does not
// exist. The memory fallback is what makes the store safe to create during
// server-side rendering.
describe('session storage in a server environment', () => {
  it('falls back to memory storage without a localStorage global', () => {
    expect(typeof localStorage).toBe('undefined');

    const storage = createDefaultStorage();
    storage.set('seamlessauth_seen', 'true');

    expect(storage.get('seamlessauth_seen')).toBe('true');
  });

  it('creates a session without touching browser APIs', () => {
    const session = createAuthSession({ apiHost: 'https://api.example.com' });

    expect(session.getState()).toMatchObject({
      isAuthenticated: false,
      loading: true,
      hasSignedInBefore: false,
    });
  });
});
