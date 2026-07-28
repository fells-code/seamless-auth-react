/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  createBrowserStorage,
  createDefaultStorage,
  createMemoryStorage,
} from '../src/session/storage';

describe('session storage ports', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('reads back what it stored, in memory', () => {
    const storage = createMemoryStorage();

    expect(storage.get('seamlessauth_seen')).toBeNull();

    storage.set('seamlessauth_seen', 'true');

    expect(storage.get('seamlessauth_seen')).toBe('true');
  });

  it('reads and writes localStorage in the browser', () => {
    const storage = createBrowserStorage();

    storage.set('seamlessauth_seen', 'true');

    expect(localStorage.getItem('seamlessauth_seen')).toBe('true');
    expect(storage.get('seamlessauth_seen')).toBe('true');
  });

  // Private mode and blocked storage are normal, and neither is a reason to fail
  // an auth flow.
  it('treats unavailable browser storage as an absent value', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    const storage = createBrowserStorage();

    expect(() => storage.set('seamlessauth_seen', 'true')).not.toThrow();
    expect(storage.get('seamlessauth_seen')).toBeNull();
  });

  it('defaults to browser storage where localStorage exists', () => {
    createDefaultStorage().set('seamlessauth_seen', 'true');

    expect(localStorage.getItem('seamlessauth_seen')).toBe('true');
  });
});
