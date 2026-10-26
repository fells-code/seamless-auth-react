/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  type Credential,
  PASSKEY_KIND_LABELS,
  passkeyDisplayName,
  passkeyKind,
  passkeyMetadataForThisDevice,
  passkeyRegistrationErrorMessage,
} from '@seamless-auth/client';
import React, { useState } from 'react';

import { useAuth } from '@/AuthProvider';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import styles from '@/styles/accountSecurity.module.css';

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString() : null;

interface PasskeyRowProps {
  credential: Credential;
  onlyOne: boolean;
}

const PasskeyRow: React.FC<PasskeyRowProps> = ({ credential, onlyOne }) => {
  const { updateCredential, deleteCredential } = useAuth();
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [name, setName] = useState(passkeyDisplayName(credential));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const displayName = passkeyDisplayName(credential);
  const lastUsed = formatDate(credential.lastUsedAt);
  const added = formatDate(credential.createdAt);

  const rename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    const trimmed = name.trim();
    const { error: renameError } = await updateCredential({
      ...credential,
      friendlyName: trimmed === '' ? null : trimmed,
    });

    setBusy(false);

    if (renameError) {
      setError('Could not rename this passkey. Please try again.');
      return;
    }

    setRenaming(false);
  };

  const remove = async () => {
    setBusy(true);
    setError('');

    const { error: deleteError } = await deleteCredential(credential.id);

    setBusy(false);

    if (deleteError) {
      setError('Could not delete this passkey. Please try again.');
      setConfirmingDelete(false);
    }
  };

  return (
    <li className={styles.item}>
      <div>
        {renaming ? (
          <form onSubmit={rename} className={styles.itemActions}>
            <label>
              <span className={styles.meta}>Passkey name</span>
              <input
                className={styles.input}
                value={name}
                onChange={event => setName(event.target.value)}
                maxLength={100}
                autoFocus
              />
            </label>
            <button type="submit" className={styles.button} disabled={busy}>
              Save
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                setRenaming(false);
                setName(displayName);
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <span className={styles.itemName}>{displayName}</span>
        )}
        <p className={styles.meta}>
          {PASSKEY_KIND_LABELS[passkeyKind(credential)]}
          {added ? ` · Added ${added}` : ''}
          {` · ${lastUsed ? `Last used ${lastUsed}` : 'Never used'}`}
        </p>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>

      {!renaming && (
        <div className={styles.itemActions}>
          {confirmingDelete ? (
            <>
              <span className={styles.meta}>
                {onlyOne
                  ? 'This is your only passkey. Delete it anyway?'
                  : 'Delete this passkey?'}
              </span>
              <button
                type="button"
                className={styles.danger}
                onClick={() => void remove()}
                disabled={busy}
              >
                Delete
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setConfirmingDelete(false)}
              >
                Keep
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setRenaming(true)}
                aria-label={`Rename ${displayName}`}
              >
                Rename
              </button>
              <button
                type="button"
                className={styles.danger}
                onClick={() => setConfirmingDelete(true)}
                aria-label={`Delete ${displayName}`}
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
};

/**
 * The signed-in user's passkeys: rename, delete, and add another. Reads
 * `credentials` from the provider, so a change shows without a reload.
 */
export const PasskeyManagement: React.FC = () => {
  const { credentials, registerPasskey } = useAuth();
  const { passkeySupported, loading: supportLoading } = usePasskeySupport();
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string }>();

  const add = async () => {
    setAdding(true);
    setMessage(undefined);

    const { error } = await registerPasskey({ metadata: passkeyMetadataForThisDevice() });

    setAdding(false);
    setMessage(
      error
        ? { kind: 'error', text: passkeyRegistrationErrorMessage(error) }
        : { kind: 'success', text: 'Passkey added.' }
    );
  };

  return (
    <section className={styles.section} aria-labelledby="seamless-passkeys-heading">
      <h3 id="seamless-passkeys-heading" className={styles.heading}>
        Passkeys
      </h3>
      <p className={styles.description}>
        Passkeys sign you in with your device&apos;s screen lock or a security key.
      </p>

      {credentials.length === 0 && (
        <p className={styles.warning}>
          You have no passkeys. Add one so you can sign in without a code.
        </p>
      )}

      {credentials.length === 1 && (
        <p className={styles.notice}>
          You have one passkey. Add a second, on another device or a security key, so
          losing this one does not lock you out.
        </p>
      )}

      {credentials.length > 0 && (
        <ul className={styles.list}>
          {credentials.map(credential => (
            <PasskeyRow
              key={credential.id}
              credential={credential}
              onlyOne={credentials.length === 1}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        className={styles.button}
        onClick={() => void add()}
        disabled={adding || !passkeySupported}
      >
        {adding ? 'Adding...' : 'Add a passkey'}
      </button>
      {!supportLoading && !passkeySupported && (
        <p className={styles.meta}>This browser cannot create passkeys.</p>
      )}

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={message.kind === 'error' ? styles.error : styles.success}
        >
          {message.text}
        </p>
      )}
    </section>
  );
};

export default PasskeyManagement;
