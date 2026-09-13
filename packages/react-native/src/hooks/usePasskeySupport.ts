/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useState } from 'react';

import { useAuth } from '@/AuthProvider';

/** Whether this device can enrol and use passkeys, from the passkey port. */
export const usePasskeySupport = () => {
  const { ports } = useAuth();
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkSupport = async () => {
      try {
        const supported =
          ports.passkeys.isSupported() &&
          (await ports.passkeys.isPlatformAuthenticatorAvailable());
        if (active) setPasskeySupported(supported);
      } catch {
        if (active) setPasskeySupported(false);
      } finally {
        if (active) setLoading(false);
      }
    };

    void checkSupport();

    return () => {
      active = false;
    };
  }, [ports.passkeys]);

  return { passkeySupported, loading };
};
