/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useState } from 'react';

import { detectPasskeySupport } from '@seamless-auth/client';
import { useAuth } from '@/AuthProvider';

/** Whether this device can enrol and use passkeys, from the passkey port. */
export const usePasskeySupport = () => {
  const { ports } = useAuth();
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void detectPasskeySupport(ports.passkeys).then(supported => {
      if (active) {
        setPasskeySupported(supported);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [ports.passkeys]);

  return { passkeySupported, loading };
};
