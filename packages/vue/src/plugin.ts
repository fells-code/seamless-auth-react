/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  createAuthSession,
  createBrowserOAuthRedirect,
  createBrowserPasskeyPort,
  createMemoryStorage,
  detectPasskeySupport,
  loadLoginMethods,
  type AuthSessionActions,
  type AuthSessionState,
  type LoginMethod,
  type SeamlessAuthClient,
} from '@seamless-auth/client';
import {
  computed,
  inject,
  readonly,
  ref,
  shallowRef,
  type App,
  type ComputedRef,
  type InjectionKey,
  type Plugin,
  type Ref,
} from 'vue';

import type { SeamlessAuthConfig, SeamlessAuthPorts } from './config';

/**
 * Session state and auth actions for a Vue application, from `useSeamlessAuth()`.
 *
 * A thin binding over the framework-agnostic session store in
 * `@seamless-auth/client`: the store owns the state machine, and this exposes
 * it as reactive refs. Every ref is read-only; change the session through the
 * actions.
 */
export interface SeamlessAuth extends AuthSessionActions {
  /** Everything the session knows. Replaced wholesale on every change. */
  state: Readonly<Ref<AuthSessionState>>;
  user: ComputedRef<AuthSessionState['user']>;
  isAuthenticated: ComputedRef<boolean>;
  /** True until the session has been read. Guards wait on this. */
  loading: ComputedRef<boolean>;
  credentials: ComputedRef<AuthSessionState['credentials']>;
  organizations: ComputedRef<AuthSessionState['organizations']>;
  activeOrganization: ComputedRef<AuthSessionState['activeOrganization']>;
  stepUpStatus: ComputedRef<AuthSessionState['stepUpStatus']>;
  hasSignedInBefore: ComputedRef<boolean>;

  /**
   * Sign-in methods this instance has enabled, once `loadLoginMethods()` has
   * answered. Null means unknown, never "none".
   */
  loginMethods: Readonly<Ref<LoginMethod[] | null>>;
  loginMethodsLoading: Readonly<Ref<boolean>>;
  /** Whether this device can use a passkey, once `checkPasskeySupport()` has answered. */
  passkeySupported: Readonly<Ref<boolean>>;
  passkeySupportLoading: Readonly<Ref<boolean>>;

  /** Reads the instance's sign-in methods once and caches the answer. */
  loadLoginMethods(): Promise<LoginMethod[] | null>;
  /** Detects passkey support once and caches the answer. */
  checkPasskeySupport(): Promise<boolean>;
  /**
   * Resolves with the state once the session has been read. During a server
   * render the session is never read there, so this resolves at once with what
   * the server knows.
   */
  whenSettled(): Promise<AuthSessionState>;

  /** The client behind the session, for calls the session does not wrap. */
  client: SeamlessAuthClient;
  /**
   * A fetch for the application's own API that carries the session cookies.
   * A path resolves on `apiHost`. Only `apiHost` and `trustedOrigins` receive
   * the session; any other origin rejects with `UntrustedOriginError`.
   */
  authorizedFetch: SeamlessAuthClient['authorizedFetch'];
  /** The platform ports the bundled screens go through. */
  ports: SeamlessAuthPorts;
  /** Where the bundled screens go once someone is signed in. */
  signedInPath: string;
  /** Where `requireAuth` sends someone who is signed out. */
  loginPath: string;
}

export const SEAMLESS_AUTH_KEY: InjectionKey<SeamlessAuth> = Symbol('seamless-auth');

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

function createSeamlessAuthInstance(config: SeamlessAuthConfig): SeamlessAuth & {
  destroy(): void;
} {
  const browser = isBrowser();

  const ports: SeamlessAuthPorts = {
    passkeys: config.ports?.passkeys ?? createBrowserPasskeyPort(),
    oauthRedirect: config.ports?.oauthRedirect ?? createBrowserOAuthRedirect(),
  };

  const session = createAuthSession({
    apiHost: config.apiHost,
    magicLinkRedirectUri: config.magicLinkRedirectUri,
    // Cookie transport only. `mode` is deliberately not configurable here, so
    // no token is ever handed to page scripts.
    transport: {
      basePath: config.basePath,
      fetch: config.fetch,
      trustedOrigins: config.trustedOrigins,
    },
    passkeys: ports.passkeys,
    detectPreviousSignIn: config.autoDetectPreviousSignIn ?? true,
    initialSession: config.initialSession,
    // A server render has no browser storage to read.
    storage: browser ? undefined : createMemoryStorage(),
  });

  // A server render shows what the server knows; the browser reads the rest as
  // soon as it runs.
  const read = browser ? session.getState : session.getServerState;
  const state = shallowRef(read());
  const unsubscribe = session.subscribe(() => {
    state.value = read();
  });

  const loginMethods = ref<LoginMethod[] | null>(null);
  const loginMethodsLoading = ref(true);
  let loginMethodsRequest: Promise<LoginMethod[] | null> | null = null;

  const passkeySupported = ref(false);
  const passkeySupportLoading = ref(true);
  let passkeySupportRequest: Promise<boolean> | null = null;

  const instance: SeamlessAuth & { destroy(): void } = {
    ...session.actions,
    state: readonly(state) as Readonly<Ref<AuthSessionState>>,
    user: computed(() => state.value.user),
    isAuthenticated: computed(() => state.value.isAuthenticated),
    loading: computed(() => state.value.loading),
    credentials: computed(() => state.value.credentials),
    organizations: computed(() => state.value.organizations),
    activeOrganization: computed(() => state.value.activeOrganization),
    stepUpStatus: computed(() => state.value.stepUpStatus),
    hasSignedInBefore: computed(() => state.value.hasSignedInBefore),
    loginMethods: readonly(loginMethods) as Readonly<Ref<LoginMethod[] | null>>,
    loginMethodsLoading: readonly(loginMethodsLoading),
    passkeySupported: readonly(passkeySupported),
    passkeySupportLoading: readonly(passkeySupportLoading),

    loadLoginMethods() {
      loginMethodsRequest ??= loadLoginMethods(session.client).then(methods => {
        loginMethods.value = methods;
        loginMethodsLoading.value = false;
        return methods;
      });
      return loginMethodsRequest;
    },

    checkPasskeySupport() {
      passkeySupportRequest ??= (
        browser ? detectPasskeySupport(ports.passkeys) : Promise.resolve(false)
      ).then(supported => {
        passkeySupported.value = supported;
        passkeySupportLoading.value = false;
        return supported;
      });
      return passkeySupportRequest;
    },

    whenSettled() {
      const current = state.value;

      if (!current.loading || !browser) {
        return Promise.resolve(current);
      }

      return new Promise(resolve => {
        const stop = session.subscribe(() => {
          const next = session.getState();

          if (!next.loading) {
            stop();
            resolve(next);
          }
        });
      });
    },

    client: session.client,
    authorizedFetch: (input, init) => session.client.authorizedFetch(input, init),
    ports,
    signedInPath: config.signedInPath ?? '/',
    loginPath: config.loginPath ?? '/login',

    destroy() {
      unsubscribe();
      session.destroy();
    },
  };

  if (browser) {
    void session.actions.refreshSession({
      background: config.initialSession !== undefined,
    });
  }

  return instance;
}

/**
 * The Vue plugin. Each application it is installed in gets its own session, so
 * a server rendering many requests never shares one between them:
 *
 * ```ts
 * createApp(App).use(router).use(createSeamlessAuth({ apiHost: 'https://app.example.com' }))
 * ```
 *
 * The session is read as soon as the application is installed in the browser.
 */
export function createSeamlessAuth(config: SeamlessAuthConfig): Plugin {
  return {
    install(app: App) {
      const instance = createSeamlessAuthInstance(config);
      app.provide(SEAMLESS_AUTH_KEY, instance);
      app.onUnmount(() => instance.destroy());
    },
  };
}

/**
 * The session for the current application. Call it in `setup`, a composable,
 * or a navigation guard.
 */
export function useSeamlessAuth(): SeamlessAuth {
  const auth = inject(SEAMLESS_AUTH_KEY, null);

  if (!auth) {
    throw new Error(
      'Seamless Auth is not installed. Add app.use(createSeamlessAuth({ apiHost })) before mounting the app.'
    );
  }

  return auth;
}
