/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
} from '@simplewebauthn/browser';

export interface User {
  id: string;
  email: string;
  phone: string;
  roles?: string[];
}

export interface Credential {
  id: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  deviceType: CredentialDeviceType;
  backedup: boolean;
  friendlyName: string | null;
  lastUsedAt: Date | null;
  platform: string | null;
  browser: string | null;
  deviceInfo: string | null;
}
