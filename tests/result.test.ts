/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { SeamlessAuthError } from '@/client/errors';
import { requestResult, resultOf, resultError } from '@/client/result';

const res = (init: Partial<Response> & { json?: () => Promise<unknown> }) =>
  init as unknown as Response;

describe('requestResult', () => {
  it('returns parsed data on success', async () => {
    const r = await requestResult<{ a: number }>(
      Promise.resolve(res({ ok: true, status: 200, json: async () => ({ a: 1 }) })),
      'fallback'
    );
    expect(r.error).toBeNull();
    expect(r.data).toEqual({ a: 1 });
  });

  it('tolerates a successful response with no body', async () => {
    const r = await requestResult<void>(
      Promise.resolve(
        res({
          ok: true,
          status: 204,
          json: async () => {
            throw new SyntaxError('empty');
          },
        })
      ),
      'fallback'
    );
    expect(r.error).toBeNull();
    expect(r.data).toBeUndefined();
  });

  it('returns the server error detail on failure', async () => {
    const r = await requestResult(
      Promise.resolve(
        res({
          ok: false,
          status: 403,
          json: async () => ({ error: 'OAuth signup is disabled' }),
        })
      ),
      'fallback'
    );
    expect(r.data).toBeNull();
    expect(r.error).toBeInstanceOf(SeamlessAuthError);
    expect(r.error?.message).toBe('OAuth signup is disabled');
    expect(r.error?.status).toBe(403);
  });

  it('absorbs transport failures instead of throwing', async () => {
    const r = await requestResult(
      Promise.reject(new TypeError('network down')),
      'Could not reach the server.'
    );
    expect(r.data).toBeNull();
    expect(r.error?.message).toBe('Could not reach the server.');
    expect(r.error?.status).toBe(0);
  });

  it('builds results directly', () => {
    expect(resultOf(5).data).toBe(5);
    expect(resultError('nope', 400).error?.status).toBe(400);
  });
});
