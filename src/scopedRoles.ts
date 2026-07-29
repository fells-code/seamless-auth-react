/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

/*
 * Role matching is an authorization rule, not an SDK concern, so it comes from
 * `@seamless-auth/types` rather than being reimplemented per client. This is the
 * one runtime import from that package: the `role/matching` subpath is free of
 * Zod, so nothing else is pulled into the bundle.
 *
 * This file stays as the SDK's export boundary, so adopters keep importing these
 * from `@seamless-auth/react` and the tests keep pinning the behavior the
 * provider's `hasScopedRole()` depends on.
 */
export { hasScopedRole, roleGrantsAccess } from '@seamless-auth/types/role/matching';
