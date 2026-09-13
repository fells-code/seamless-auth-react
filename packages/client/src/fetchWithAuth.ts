/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  createTransport,
  type FetchWithAuth,
  type Transport,
  type TransportOptions,
} from './transport';

export interface FetchWithAuthOptions extends Omit<TransportOptions, 'apiHost'> {
  authHost?: string;
}

/**
 * The fetch every client method goes through.
 *
 * Kept as the seam the client is built on (and tests replace) while the work
 * moved into `createTransport`: cookie transport is what this always did, and
 * bearer transport is the same call with `mode: 'bearer'`.
 */
export const createFetchWithAuth = (opts: FetchWithAuthOptions): FetchWithAuth => {
  return createFetchTransport(opts).fetch;
};

export const createFetchTransport = (opts: FetchWithAuthOptions): Transport => {
  const { authHost, ...transport } = opts;
  return createTransport({ ...transport, apiHost: authHost ?? '' });
};
