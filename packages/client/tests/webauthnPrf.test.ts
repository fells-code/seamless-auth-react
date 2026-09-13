/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  createPrfRequestBody,
  encodePrfSalt,
  extractPasskeyPrfResult,
  preparePrfRequestOptions,
  stripPrfResultsFromAssertion,
} from '../src/client/webauthnPrf';

describe('webauthnPrf helpers', () => {
  it('encodes PRF salts and request bodies as base64url', () => {
    const salt = Uint8Array.from([1, 2, 3, 4]);

    expect(encodePrfSalt(salt)).toBe('AQIDBA');
    expect(createPrfRequestBody({ salt, credentialId: 'cred-1' })).toEqual({
      credentialId: 'cred-1',
      prf: {
        salt: 'AQIDBA',
      },
    });
  });

  it('converts PRF option salts from JSON strings to BufferSource values', () => {
    const options = preparePrfRequestOptions({
      challenge: 'challenge',
      extensions: {
        prf: {
          eval: {
            first: 'AQIDBA',
          },
        },
      } as any,
    });

    expect((options.extensions as any).prf.eval.first).toBeInstanceOf(ArrayBuffer);
    expect(
      Array.from(new Uint8Array((options.extensions as any).prf.eval.first))
    ).toEqual([1, 2, 3, 4]);
  });

  it('extracts PRF output and strips it from assertion payloads', () => {
    const assertion: any = {
      id: 'cred-1',
      rawId: 'cred-1',
      response: {
        clientDataJSON: 'client-data',
        authenticatorData: 'auth-data',
        signature: 'sig',
      },
      type: 'public-key',
      clientExtensionResults: {
        prf: {
          results: {
            first: Uint8Array.from([5, 6, 7, 8]).buffer,
          },
        },
      },
    };

    expect(extractPasskeyPrfResult(assertion)).toEqual({
      credentialId: 'cred-1',
      output: Uint8Array.from([5, 6, 7, 8]),
      outputBase64url: 'BQYHCA',
    });
    expect(JSON.stringify(stripPrfResultsFromAssertion(assertion))).not.toContain(
      'BQYHCA'
    );
    expect(
      (stripPrfResultsFromAssertion(assertion).clientExtensionResults as any).prf.results
    ).toBeUndefined();
  });
});
