/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  base64URLStringToBuffer,
  bufferToBase64URLString,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

import { isWebAuthnAvailable } from './webauthnSupport';

export type PasskeyPrfSalt = ArrayBuffer | ArrayBufferView | string;

export interface PasskeyPrfInput {
  salt: PasskeyPrfSalt;
  secondSalt?: PasskeyPrfSalt;
  credentialId?: string;
}

export interface PasskeyPrfResult {
  credentialId: string;
  output: Uint8Array;
  outputBase64url: string;
}

type PrfExtensionEval = {
  first?: PasskeyPrfSalt;
  second?: PasskeyPrfSalt;
};

type PrfOptionsJSON = PublicKeyCredentialRequestOptionsJSON & {
  extensions?: PublicKeyCredentialRequestOptionsJSON['extensions'] & {
    prf?: {
      eval?: PrfExtensionEval;
    };
  };
};

type PrfClientExtensionResults = {
  prf?: {
    enabled?: boolean;
    results?: {
      first?: ArrayBuffer | ArrayBufferView;
      second?: ArrayBuffer | ArrayBufferView;
    };
  };
};

function toArrayBuffer(value: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (value instanceof ArrayBuffer) {
    return value;
  }

  const source = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);

  return copy.buffer;
}

function toUint8Array(value: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

export function encodePrfSalt(salt: PasskeyPrfSalt): string {
  if (typeof salt === 'string') {
    return salt;
  }

  return bufferToBase64URLString(toArrayBuffer(salt));
}

function saltToBufferSource(salt: PasskeyPrfSalt): ArrayBuffer | ArrayBufferView {
  if (typeof salt === 'string') {
    return base64URLStringToBuffer(salt);
  }

  return salt;
}

export function createPrfRequestBody(input: PasskeyPrfInput) {
  return {
    ...(input.credentialId ? { credentialId: input.credentialId } : {}),
    prf: {
      salt: encodePrfSalt(input.salt),
      ...(input.secondSalt ? { secondSalt: encodePrfSalt(input.secondSalt) } : {}),
    },
  };
}

export async function isPasskeyPrfSupported(): Promise<boolean> {
  return isWebAuthnAvailable();
}

export function preparePrfRequestOptions(
  optionsJSON: PublicKeyCredentialRequestOptionsJSON
): PublicKeyCredentialRequestOptionsJSON {
  const options = optionsJSON as PrfOptionsJSON;
  const prfEval = options.extensions?.prf?.eval;

  if (!prfEval) {
    return optionsJSON;
  }

  return {
    ...options,
    extensions: {
      ...options.extensions,
      prf: {
        ...options.extensions?.prf,
        eval: {
          ...prfEval,
          ...(prfEval.first ? { first: saltToBufferSource(prfEval.first) } : {}),
          ...(prfEval.second ? { second: saltToBufferSource(prfEval.second) } : {}),
        },
      },
    },
  } as PublicKeyCredentialRequestOptionsJSON;
}

export function extractPasskeyPrfResult(
  credential: AuthenticationResponseJSON
): PasskeyPrfResult | null {
  const extensionResults =
    credential.clientExtensionResults as unknown as PrfClientExtensionResults;
  const first = extensionResults?.prf?.results?.first;

  if (!first) {
    return null;
  }

  const output = toUint8Array(first);

  return {
    credentialId: credential.id,
    output,
    outputBase64url: bufferToBase64URLString(toArrayBuffer(output)),
  };
}

export function stripPrfResultsFromAssertion(
  credential: AuthenticationResponseJSON
): AuthenticationResponseJSON {
  const extensionResults =
    credential.clientExtensionResults as unknown as PrfClientExtensionResults;

  if (!extensionResults?.prf?.results) {
    return credential;
  }

  return {
    ...credential,
    clientExtensionResults: {
      ...credential.clientExtensionResults,
      prf: {
        ...extensionResults.prf,
        results: undefined,
      },
    },
  } as AuthenticationResponseJSON;
}

export function getRegistrationPrfCapable(attestationResponse: {
  clientExtensionResults?: unknown;
}) {
  const extensionResults = attestationResponse.clientExtensionResults as
    | PrfClientExtensionResults
    | undefined;

  return extensionResults?.prf?.enabled === true;
}
