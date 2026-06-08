/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { hasScopedRole, roleGrantsAccess } from '../src/scopedRoles';

describe('scoped roles', () => {
  it('matches exact roles', () => {
    expect(roleGrantsAccess('admin', 'admin')).toBe(true);
    expect(roleGrantsAccess('admin:read', 'admin:read')).toBe(true);
  });

  it('lets broad and write roles satisfy scoped read checks', () => {
    expect(roleGrantsAccess('admin', 'admin:read')).toBe(true);
    expect(roleGrantsAccess('admin:write', 'admin:read')).toBe(true);
  });

  it('does not let read satisfy write or plain broad checks', () => {
    expect(roleGrantsAccess('admin:read', 'admin:write')).toBe(false);
    expect(roleGrantsAccess('admin:read', 'admin')).toBe(false);
  });

  it('checks any granted role against any required role', () => {
    expect(hasScopedRole(['user', 'admin:read'], ['admin:write', 'admin:read'])).toBe(
      true
    );
    expect(hasScopedRole(['user'], ['admin:write', 'admin:read'])).toBe(false);
  });
});
