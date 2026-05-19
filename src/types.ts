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
  activeOrganizationId?: string | null;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  roles: string[];
  scopes: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
  user?: User;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdByUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  membership?: OrganizationMembership;
  memberCount?: number;
}

export interface Credential {
  id: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  deviceType: CredentialDeviceType;
  backedup: boolean;
  backedUp?: boolean;
  prfCapable?: boolean;
  friendlyName: string | null;
  lastUsedAt: Date | null;
  platform: string | null;
  browser: string | null;
  deviceInfo: string | null;
}
