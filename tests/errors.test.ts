/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { SeamlessAuthError, toSeamlessAuthError } from '@/client/errors';

const responseWith = (status: number, json: () => Promise<unknown>) =>
  ({ status, json }) as unknown as Response;

describe('toSeamlessAuthError', () => {
  it('uses the auth API error field as the message', async () => {
    const error = await toSeamlessAuthError(
      responseWith(403, async () => ({ error: 'OAuth signup is disabled' })),
      'fallback'
    );

    expect(error).toBeInstanceOf(SeamlessAuthError);
    expect(error.message).toBe('OAuth signup is disabled');
    expect(error.status).toBe(403);
    expect(error.body).toEqual({ error: 'OAuth signup is disabled' });
  });

  it('falls back to the message field when error is absent', async () => {
    const error = await toSeamlessAuthError(
      responseWith(400, async () => ({ message: 'Something specific' })),
      'fallback'
    );

    expect(error.message).toBe('Something specific');
  });

  it('uses the fallback when the body is not JSON', async () => {
    const error = await toSeamlessAuthError(
      responseWith(500, async () => {
        throw new SyntaxError('Unexpected token');
      }),
      'Failed to finish OAuth login'
    );

    expect(error.message).toBe('Failed to finish OAuth login');
    expect(error.status).toBe(500);
    expect(error.body).toBeUndefined();
  });

  it('uses the fallback when the body carries no usable message', async () => {
    const error = await toSeamlessAuthError(
      responseWith(400, async () => ({ error: '' })),
      'fallback'
    );

    expect(error.message).toBe('fallback');
    expect(error.body).toEqual({ error: '' });
  });

  it('is catchable as an Error and keeps its name', async () => {
    const error = await toSeamlessAuthError(
      responseWith(400, async () => ({ error: 'nope' })),
      'fallback'
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('SeamlessAuthError');
  });
});
