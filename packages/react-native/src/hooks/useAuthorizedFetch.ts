/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from '@/AuthProvider';

/**
 * A fetch for the application's own API that carries the access token and
 * refreshes it once on a 401. A path resolves on `apiHost`.
 */
export const useAuthorizedFetch = () => useAuth().client.authorizedFetch;
