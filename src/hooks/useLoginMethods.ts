/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useState } from 'react';

import type { LoginMethod } from '@/client/createSeamlessAuthClient';
import { useAuthClient } from '@/hooks/useAuthClient';

/**
 * Used only until the instance answers, and if it never does.
 *
 * Deliberately the narrowest useful set, and matching the auth server's own
 * defaults. Offering a method that turns out to be disabled sends a user down a
 * path that fails, which is worse than showing one option too few.
 */
export const FALLBACK_LOGIN_METHODS: LoginMethod[] = ['passkey', 'magic_link'];

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

    const read = async () => {
      try {
        const { data, error } = await authClient.getPublicSystemConfig();

        if (active && !error && data?.loginMethods?.length) {
          setLoginMethods(data.loginMethods);
        }
      } catch {
        // Backstop only. The client reports request failures through `error`,
        // not by throwing, and either way the methods stay unknown. Leaving
        // `loading` true here would hang every screen that waits on it.
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void read();

    return () => {
      active = false;
    };
  }, [authClient]);

  return { loginMethods, loading };
};

/**
 * Whether a user who declines a passkey would still have a way to sign in.
 *
 * Returns false while the methods are unknown, so a failed or in-flight request
 * never produces a skip control that could strand someone in an account they
 * cannot get back into.
 */
export const hasNonPasskeyLoginMethod = (loginMethods: LoginMethod[] | null) =>
  Boolean(loginMethods?.some(method => method !== 'passkey'));
