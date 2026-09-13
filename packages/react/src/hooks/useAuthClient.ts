/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from '@/AuthProvider';

/**
 * The client behind the provider's session. The same instance the store
 * drives, not a second one: in bearer transport the client holds the sign-in
 * in flight, and a second client would not see it.
 */
export const useAuthClient = () => {
  return useAuth().client;
};
