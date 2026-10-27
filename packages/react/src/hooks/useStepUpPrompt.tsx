/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  SeamlessAuthError,
  type SeamlessAuthResult,
  type StepUpStatus,
  totpErrorMessage,
} from '@seamless-auth/client';
import React, { ReactNode, useCallback, useRef, useState } from 'react';

import { useAuth } from '@/AuthProvider';
import TotpCodeForm from '@/components/TotpCodeForm';
import { useAuthClient } from '@/hooks/useAuthClient';
import recoveryStyles from '@/styles/recovery.module.css';
import styles from '@/styles/totp.module.css';

type Settle = (result: SeamlessAuthResult<StepUpStatus>) => void;

/**
 * A `verifyStepUp` for flows such as `generateRecoveryCodesWithStepUp`. With an
 * authenticator app enrolled it renders `prompt` and waits for a code (or the
 * passkey, when there is one); otherwise it goes straight to the passkey.
 * `cancelled()` reports whether the last step-up ended because the user
 * dismissed the prompt, so the caller can stay quiet about it.
 */
export function useStepUpPrompt(): {
  verifyStepUp: () => Promise<SeamlessAuthResult<StepUpStatus>>;
  prompt: ReactNode;
  cancelled: () => boolean;
} {
  const authClient = useAuthClient();
  const { credentials, verifyStepUpWithPasskey, verifyStepUpWithTotp } = useAuth();
  const [open, setOpen] = useState(false);
  const settleRef = useRef<Settle | null>(null);
  const cancelledRef = useRef(false);

  const verifyStepUp = useCallback(async () => {
    cancelledRef.current = false;

    const { data } = await authClient.getTotpStatus();

    if (!data?.enabled) {
      return verifyStepUpWithPasskey();
    }

    setOpen(true);
    return new Promise<SeamlessAuthResult<StepUpStatus>>(resolve => {
      settleRef.current = resolve;
    });
  }, [authClient, verifyStepUpWithPasskey]);

  const settle: Settle = result => {
    setOpen(false);
    settleRef.current?.(result);
    settleRef.current = null;
  };

  const submitCode = async (code: string) => {
    const result = await verifyStepUpWithTotp(code);

    if (result.error) {
      return totpErrorMessage(result.error, 'We could not verify that code.');
    }

    settle(result);
    return null;
  };

  const stepUpWithPasskey = async () => settle(await verifyStepUpWithPasskey());

  const cancel = () => {
    cancelledRef.current = true;
    settle({ data: null, error: new SeamlessAuthError('Step-up cancelled.', 0) });
  };

  const prompt = open ? (
    <div className={styles.prompt} role="group" aria-label="Confirm it is you">
      <p className={recoveryStyles.description}>
        Confirm it is you. Enter the current code from your authenticator app.
      </p>
      <TotpCodeForm submitLabel="Confirm" onSubmit={submitCode}>
        {(credentials?.length ?? 0) > 0 && (
          <button
            type="button"
            className={recoveryStyles.secondary}
            onClick={() => void stepUpWithPasskey()}
          >
            Use your passkey instead
          </button>
        )}
        <button type="button" className={recoveryStyles.link} onClick={cancel}>
          Cancel
        </button>
      </TotpCodeForm>
    </div>
  ) : null;

  return { verifyStepUp, prompt, cancelled: () => cancelledRef.current };
}
