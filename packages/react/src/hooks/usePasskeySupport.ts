/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useState } from 'react';

import { isPasskeySupported } from '@/utils';

export const usePasskeySupport = () => {
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkSupport = async () => {
      try {
        const supported = await isPasskeySupported();
        if (active) {
          setPasskeySupported(supported);
        }
      } catch {
        if (active) {
          setPasskeySupported(false);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void checkSupport();

    return () => {
      active = false;
    };
  }, []);

  return { passkeySupported, loading };
};
