/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useMemo } from 'react';

import { useAuth } from '@/AuthProvider';
import { createSeamlessAuthClient } from '@/client/createSeamlessAuthClient';

export const useAuthClient = () => {
  const { apiHost, mode } = useAuth();

  return useMemo(
    () =>
      createSeamlessAuthClient({
        apiHost,
        mode,
      }),
    [apiHost, mode]
  );
};
