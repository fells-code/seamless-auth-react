/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { Credential, Organization, User } from '@/types';
import type {
  LoginStartResult,
  MessageResult,
  OrganizationSwitchResult,
  StepUpStatus,
} from '@/client/createSeamlessAuthClient';

/*
 * These assertions run at compile time, not at runtime: `npm run typecheck`
 * covers tests/, so a shape drifting back from the published wire contract fails
 * the build rather than reaching adopters as a type that lies about the payload.
 */
describe('wire types match what the API sends', () => {
  it('types credential timestamps as ISO strings, not Dates', () => {
    const lastUsedAt: string | null | undefined = null as Credential['lastUsedAt'];
    const createdAt: string = '' as Credential['createdAt'];

    // The bug this replaced: `Date | null` let adopters call Date methods on a
    // string, which typechecked and then threw.
    // @ts-expect-error a Date is not assignable to the wire type
    const wrong: Credential['lastUsedAt'] = new Date();

    expect([lastUsedAt, createdAt, wrong]).toHaveLength(3);
  });

  it('types the user shape the way the API serializes it', () => {
    const phone: string | null = null as User['phone'];
    const roles: string[] = [] as User['roles'];

    // @ts-expect-error roles is required, so it cannot be undefined
    const wrong: User['roles'] = undefined;

    expect([phone, roles, wrong]).toHaveLength(3);
  });

  it('types organization timestamps as strings', () => {
    const createdAt: string = '' as Organization['createdAt'];

    expect(typeof createdAt).toBe('string');
  });

  // Sessions are carried by cookies, so the SDK never surfaces the token, subject,
  // or session id the API returns alongside these payloads.
  it('keeps session material off the public result types', () => {
    const login = {} as LoginStartResult;
    const organizationSwitch = {} as OrganizationSwitchResult;

    // @ts-expect-error the login result must not advertise a token
    expect(login.token).toBeUndefined();
    // @ts-expect-error the switch result must not advertise a session id
    expect(organizationSwitch.sessionId).toBeUndefined();
  });

  it('keeps the acknowledgement and step-up shapes intact', () => {
    const message: string = '' as MessageResult['message'];
    const method: 'webauthn' | 'totp' | null = null as StepUpStatus['method'];

    expect([message, method]).toHaveLength(2);
  });
});
