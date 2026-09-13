/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type {
  CredentialResponse,
  MeUser,
  Organization as OrganizationShape,
  OrganizationMembership as OrganizationMembershipShape,
} from '@seamless-auth/types';

/*
 * The wire contract lives in `@seamless-auth/types`, which is generated from the
 * auth API's Zod schemas. These names are the SDK's public vocabulary, so they
 * stay, but they are aliases now rather than a second hand-maintained copy that
 * can drift from what the API actually sends.
 *
 * Types only: nothing here is imported at runtime, so Zod never reaches the
 * browser bundle.
 */

export type User = MeUser;

export type OrganizationMembership = OrganizationMembershipShape;

export type Organization = OrganizationShape;

export type Credential = CredentialResponse;
