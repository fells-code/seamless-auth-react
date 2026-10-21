/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

/**
 * Where the binding the auth server returned from an OAuth start is kept until
 * its callback. Stored with the state it belongs to, so a binding left behind by
 * an abandoned attempt is never sent with another attempt's state. It stays on
 * this client: it is never sent to the provider or put in a URL.
 */
export const OAUTH_BINDING_STORAGE_KEY = 'seamless:oauth:binding';

interface PendingBinding {
  state: string;
  binding: string;
}

export interface OAuthBindingStore {
  save: (pending: PendingBinding) => void;
  read: (state: string) => string | null;
  clear: () => void;
}

function browserStore(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

function parse(raw: string | null): PendingBinding | null {
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);

    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as PendingBinding).state === 'string' &&
      typeof (value as PendingBinding).binding === 'string'
    ) {
      return value as PendingBinding;
    }
  } catch {
    // Unreadable values are treated as absent.
  }

  return null;
}

/**
 * sessionStorage where there is one, so the binding survives the redirect to the
 * provider. The in-memory copy covers environments without it (React Native,
 * where the callback returns to the same process) and storage that refuses writes.
 */
export function createOAuthBindingStore(): OAuthBindingStore {
  let memory: PendingBinding | null = null;

  const stored = (): PendingBinding | null => {
    try {
      return parse(browserStore()?.getItem(OAUTH_BINDING_STORAGE_KEY) ?? null);
    } catch {
      return null;
    }
  };

  return {
    save: pending => {
      memory = pending;

      try {
        browserStore()?.setItem(OAUTH_BINDING_STORAGE_KEY, JSON.stringify(pending));
      } catch {
        // Storage can be unavailable, for example in private mode.
      }
    },
    read: state => {
      for (const pending of [stored(), memory]) {
        if (pending?.state === state) return pending.binding;
      }

      return null;
    },
    clear: () => {
      memory = null;

      try {
        browserStore()?.removeItem(OAUTH_BINDING_STORAGE_KEY);
      } catch {
        // Storage can be unavailable, for example in private mode.
      }
    },
  };
}
