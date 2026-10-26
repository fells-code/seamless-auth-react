/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { loadRecoveryOptions, type RecoveryOptions } from '@seamless-auth/client';
import { useEffect, useState } from 'react';

import { useAuthClient } from '@/hooks/useAuthClient';

/**
 * Which recovery paths this instance offers, read from its public configuration.
 * Both stay false until the answer arrives, so a sign-in screen never offers a
 * path the instance has turned off.
 */
export const useRecoveryOptions = () => {
  const authClient = useAuthClient();
  const [options, setOptions] = useState<RecoveryOptions>({
    recoveryCodes: false,
    accountRecovery: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void loadRecoveryOptions(authClient).then(next => {
      if (!active) return;

      setOptions(next);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [authClient]);

  return { ...options, loading };
};
