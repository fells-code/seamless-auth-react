/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useState } from 'react';

import { loadLoginMethods, type LoginMethod } from '@seamless-auth/client';
import { useAuthClient } from '@/hooks/useAuthClient';

export { FALLBACK_LOGIN_METHODS, hasNonPasskeyLoginMethod } from '@seamless-auth/client';

/**
 * Which sign-in methods this instance has enabled, read from the auth server
 * rather than assumed.
 *
 * `loginMethods` stays null until the answer arrives, and stays null if the
 * request fails. A caller must treat that as "unknown" and not as "none": the
 * screens use it to decide what is safe to offer, and guessing in either
 * direction is worse than waiting. `loading` is what a caller renders against.
 */
export const useLoginMethods = () => {
  const authClient = useAuthClient();
  const [loginMethods, setLoginMethods] = useState<LoginMethod[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void loadLoginMethods(authClient).then(methods => {
      if (!active) return;

      if (methods) {
        setLoginMethods(methods);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [authClient]);

  return { loginMethods, loading };
};
