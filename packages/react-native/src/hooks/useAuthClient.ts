/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from '@/AuthProvider';

/**
 * The client behind the provider's session: the same instance the store
 * drives, which is what holds the sign-in in flight.
 */
export const useAuthClient = () => useAuth().client;
