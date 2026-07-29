/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  getOAuthErrorCode,
  getWebAuthnErrorDetail,
  SeamlessAuthError,
  toSeamlessAuthError,
} from '@/client/errors';

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

describe('getOAuthErrorCode', () => {
  it.each(['oauth_missing_email', 'oauth_email_not_verified', 'oauth_missing_subject'])(
    'returns the known code %s',
    code => {
      const error = new SeamlessAuthError('Sign-in failed', 400, {
        error: 'Sign-in failed',
        code,
      });

      expect(getOAuthErrorCode(error)).toBe(code);
    }
  );

  it.each(['oauth_missing_email', 'oauth_email_not_verified', 'oauth_missing_subject'])(
    'returns the known code %s nested under details',
    code => {
      const error = new SeamlessAuthError('Sign-in failed', 400, {
        error: 'Sign-in failed',
        details: { code },
      });

      expect(getOAuthErrorCode(error)).toBe(code);
    }
  );

  it('prefers the top-level code over the nested one', () => {
    const error = new SeamlessAuthError('Sign-in failed', 400, {
      code: 'oauth_missing_email',
      details: { code: 'oauth_missing_subject' },
    });

    expect(getOAuthErrorCode(error)).toBe('oauth_missing_email');
  });

  it('ignores a code the SDK does not know', () => {
    const error = new SeamlessAuthError('Sign-in failed', 400, {
      code: 'oauth_something_new',
    });

    expect(getOAuthErrorCode(error)).toBeUndefined();
  });

  it('ignores a nested code the SDK does not know', () => {
    const error = new SeamlessAuthError('Sign-in failed', 400, {
      details: { code: 'oauth_something_new' },
    });

    expect(getOAuthErrorCode(error)).toBeUndefined();
  });

  it('returns undefined when the body carries no code', () => {
    expect(
      getOAuthErrorCode(new SeamlessAuthError('Sign-in failed', 400, { error: 'nope' }))
    ).toBeUndefined();
  });

  it('returns undefined when details carries no code', () => {
    expect(
      getOAuthErrorCode(
        new SeamlessAuthError('Sign-in failed', 400, {
          error: 'nope',
          details: { requestId: 'abc' },
        })
      )
    ).toBeUndefined();
  });

  it('returns undefined for a missing or non-object body', () => {
    expect(getOAuthErrorCode(new SeamlessAuthError('nope', 500))).toBeUndefined();
    expect(
      getOAuthErrorCode(new SeamlessAuthError('nope', 500, undefined))
    ).toBeUndefined();
    expect(getOAuthErrorCode(new SeamlessAuthError('nope', 500, null))).toBeUndefined();
    expect(
      getOAuthErrorCode(new SeamlessAuthError('nope', 500, 'oauth_missing_email'))
    ).toBeUndefined();
  });

  it('returns undefined for a non-object details', () => {
    expect(
      getOAuthErrorCode(
        new SeamlessAuthError('nope', 500, { details: 'oauth_missing_email' })
      )
    ).toBeUndefined();
    expect(
      getOAuthErrorCode(new SeamlessAuthError('nope', 500, { details: null }))
    ).toBeUndefined();
  });

  it('returns undefined for anything that is not a SeamlessAuthError', () => {
    expect(getOAuthErrorCode(new Error('boom'))).toBeUndefined();
    expect(getOAuthErrorCode({ body: { code: 'oauth_missing_email' } })).toBeUndefined();
    expect(getOAuthErrorCode(null)).toBeUndefined();
  });
});

describe('getWebAuthnErrorDetail', () => {
  const ceremonyError = () => {
    const error = new Error('The operation is insecure.');
    error.name = 'SecurityError';

    return error;
  };

  it('reads the name and message off the underlying ceremony error', () => {
    const error = new SeamlessAuthError(
      'Step-up authentication failed.',
      0,
      undefined,
      ceremonyError()
    );

    expect(getWebAuthnErrorDetail(error)).toEqual({
      name: 'SecurityError',
      code: undefined,
      message: 'The operation is insecure.',
    });
  });

  it('includes the narrower reason code when the thrown error carries one', () => {
    const thrown = Object.assign(ceremonyError(), { code: 'ERROR_INVALID_RP_ID' });

    expect(
      getWebAuthnErrorDetail(new SeamlessAuthError('nope', 0, undefined, thrown))?.code
    ).toBe('ERROR_INVALID_RP_ID');
  });

  it('reads a DOMException, which is not always an Error instance across realms', () => {
    const thrown = { name: 'NotAllowedError', message: 'Cancelled.' };

    expect(
      getWebAuthnErrorDetail(new SeamlessAuthError('nope', 0, undefined, thrown))
    ).toEqual({ name: 'NotAllowedError', code: undefined, message: 'Cancelled.' });
  });

  it('returns undefined for an error with no ceremony cause', async () => {
    expect(getWebAuthnErrorDetail(new SeamlessAuthError('nope', 400))).toBeUndefined();
    expect(
      getWebAuthnErrorDetail(new SeamlessAuthError('nope', 0, undefined, 'boom'))
    ).toBeUndefined();
    expect(
      await toSeamlessAuthError(
        responseWith(400, async () => ({ error: 'nope' })),
        'fallback'
      ).then(getWebAuthnErrorDetail)
    ).toBeUndefined();
  });

  it('returns undefined for anything that is not a SeamlessAuthError', () => {
    expect(getWebAuthnErrorDetail(ceremonyError())).toBeUndefined();
    expect(getWebAuthnErrorDetail(null)).toBeUndefined();
  });
});
