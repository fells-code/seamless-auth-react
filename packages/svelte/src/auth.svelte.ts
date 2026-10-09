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
  type AuthSession,
  type AuthSessionActions,
  type AuthSessionState,
  type LoginMethod,
  type SeamlessAuthClient,
} from '@seamless-auth/client';

import type { SeamlessAuthConfig, SeamlessAuthPorts } from './config.js';

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Session state and auth actions for a Svelte application, from
 * `createSeamlessAuth`.
 *
 * A thin binding over the framework-agnostic session store in
 * `@seamless-auth/client`: the store owns the state machine, and this mirrors
 * it into runes, so every property reads reactively in a component or an
 * `$effect`. Change the session through the actions.
 */
export class SeamlessAuth implements AuthSessionActions {
  #session: AuthSession;
  // Assigned in the constructor, once the session exists.
  #state = $state.raw<AuthSessionState>(undefined as never);
  #loginMethods = $state.raw<LoginMethod[] | null>(null);
  #loginMethodsLoading = $state(true);
  #passkeySupported = $state(false);
  #passkeySupportLoading = $state(true);
  #loginMethodsRequest: Promise<LoginMethod[] | null> | null = null;
  #passkeySupportRequest: Promise<boolean> | null = null;
  #pendingSettles = new Set<() => void>();
  #unsubscribe: () => void;
  #browser: boolean;

  /** The platform ports the bundled screens go through. */
  readonly ports: SeamlessAuthPorts;
  /** The client behind the session, for calls the session does not wrap. */
  readonly client: SeamlessAuthClient;
  /** How the bundled screens add their stylesheet. */
  readonly styles: { inject: boolean; nonce?: string };
  /** Where the bundled screens go once someone is signed in. */
  readonly signedInPath: string;
  /** Where `requireAuth` sends someone who is signed out. */
  readonly loginPath: string;

  constructor(config: SeamlessAuthConfig) {
    this.#browser = isBrowser();

    this.ports = {
      passkeys: config.ports?.passkeys ?? createBrowserPasskeyPort(),
      oauthRedirect: config.ports?.oauthRedirect ?? createBrowserOAuthRedirect(),
    };

    this.#session = createAuthSession({
      apiHost: config.apiHost,
      magicLinkRedirectUri: config.magicLinkRedirectUri,
      // Cookie transport only. `mode` is deliberately not configurable here, so
      // no token is ever handed to page scripts.
      transport: {
        basePath: config.basePath,
        fetch: config.fetch,
        trustedOrigins: config.trustedOrigins,
      },
      passkeys: this.ports.passkeys,
      detectPreviousSignIn: config.autoDetectPreviousSignIn ?? true,
      initialSession: config.initialSession,
      // A server render has no browser storage to read.
      storage: this.#browser ? undefined : createMemoryStorage(),
    });

    this.client = this.#session.client;
    this.styles = { inject: config.injectStyles ?? true, nonce: config.cspNonce };
    this.signedInPath = config.signedInPath ?? '/';
    this.loginPath = config.loginPath ?? '/login';

    // A server render shows what the server knows; the browser reads the rest
    // as soon as it runs.
    const read = this.#browser ? this.#session.getState : this.#session.getServerState;
    this.#state = read();
    this.#unsubscribe = this.#session.subscribe(() => {
      this.#state = read();
    });

    if (this.#browser) {
      void this.#session.actions.refreshSession({
        background: config.initialSession !== undefined,
      });
    }
  }

  /** Everything the session knows. Replaced wholesale on every change. */
  get state(): AuthSessionState {
    return this.#state;
  }
  get user() {
    return this.#state.user;
  }
  get isAuthenticated() {
    return this.#state.isAuthenticated;
  }
  /** True until the session has been read. Guards wait on this. */
  get loading() {
    return this.#state.loading;
  }
  get credentials() {
    return this.#state.credentials;
  }
  get organizations() {
    return this.#state.organizations;
  }
  get activeOrganization() {
    return this.#state.activeOrganization;
  }
  get stepUpStatus() {
    return this.#state.stepUpStatus;
  }
  get hasSignedInBefore() {
    return this.#state.hasSignedInBefore;
  }

  /**
   * Sign-in methods this instance has enabled, once `loadLoginMethods()` has
   * answered. Null means unknown, never "none".
   */
  get loginMethods() {
    return this.#loginMethods;
  }
  get loginMethodsLoading() {
    return this.#loginMethodsLoading;
  }
  /** Whether this device can use a passkey, once `checkPasskeySupport()` has answered. */
  get passkeySupported() {
    return this.#passkeySupported;
  }
  get passkeySupportLoading() {
    return this.#passkeySupportLoading;
  }

  /** Reads the instance's sign-in methods once and caches the answer. */
  loadLoginMethods(): Promise<LoginMethod[] | null> {
    this.#loginMethodsRequest ??= loadLoginMethods(this.client).then(methods => {
      this.#loginMethods = methods;
      this.#loginMethodsLoading = false;
      return methods;
    });
    return this.#loginMethodsRequest;
  }

  /** Detects passkey support once and caches the answer. */
  checkPasskeySupport(): Promise<boolean> {
    this.#passkeySupportRequest ??= (
      this.#browser ? detectPasskeySupport(this.ports.passkeys) : Promise.resolve(false)
    ).then(supported => {
      this.#passkeySupported = supported;
      this.#passkeySupportLoading = false;
      return supported;
    });
    return this.#passkeySupportRequest;
  }

  /**
   * Resolves with the state once the session has been read. During a server
   * render the session is never read there, so this resolves at once with what
   * the server knows. It also resolves if the session is destroyed first.
   */
  whenSettled(): Promise<AuthSessionState> {
    const current = this.#state;

    if (!current.loading || !this.#browser) {
      return Promise.resolve(current);
    }

    return new Promise(resolve => {
      const settle = (next: AuthSessionState) => {
        stop();
        this.#pendingSettles.delete(abandon);
        resolve(next);
      };
      const abandon = () => settle(this.#state);
      const stop = this.#session.subscribe(() => {
        const next = this.#session.getState();
        if (!next.loading) settle(next);
      });
      this.#pendingSettles.add(abandon);
    });
  }

  /**
   * A fetch for the application's own API that carries the session cookies.
   * A path resolves on `apiHost`. Only `apiHost` and `trustedOrigins` receive
   * the session; any other origin rejects with `UntrustedOriginError`.
   */
  authorizedFetch: SeamlessAuthClient['authorizedFetch'] = (input, init) =>
    this.client.authorizedFetch(input, init);

  login: AuthSessionActions['login'] = (...args) => this.#session.actions.login(...args);
  handlePasskeyLogin: AuthSessionActions['handlePasskeyLogin'] = () =>
    this.#session.actions.handlePasskeyLogin();
  registerPasskey: AuthSessionActions['registerPasskey'] = input =>
    this.#session.actions.registerPasskey(input);
  refreshSession: AuthSessionActions['refreshSession'] = options =>
    this.#session.actions.refreshSession(options);
  logout: AuthSessionActions['logout'] = () => this.#session.actions.logout();
  logoutAllSessions: AuthSessionActions['logoutAllSessions'] = () =>
    this.#session.actions.logoutAllSessions();
  deleteUser: AuthSessionActions['deleteUser'] = () => this.#session.actions.deleteUser();
  updateCredential: AuthSessionActions['updateCredential'] = credential =>
    this.#session.actions.updateCredential(credential);
  deleteCredential: AuthSessionActions['deleteCredential'] = id =>
    this.#session.actions.deleteCredential(id);
  switchOrganization: AuthSessionActions['switchOrganization'] = id =>
    this.#session.actions.switchOrganization(id);
  listOAuthProviders: AuthSessionActions['listOAuthProviders'] = () =>
    this.#session.actions.listOAuthProviders();
  startOAuthLogin: AuthSessionActions['startOAuthLogin'] = input =>
    this.#session.actions.startOAuthLogin(input);
  finishOAuthLogin: AuthSessionActions['finishOAuthLogin'] = input =>
    this.#session.actions.finishOAuthLogin(input);
  refreshStepUpStatus: AuthSessionActions['refreshStepUpStatus'] = () =>
    this.#session.actions.refreshStepUpStatus();
  verifyStepUpWithPasskey: AuthSessionActions['verifyStepUpWithPasskey'] = () =>
    this.#session.actions.verifyStepUpWithPasskey();
  verifyStepUpWithPasskeyPrf: AuthSessionActions['verifyStepUpWithPasskeyPrf'] = input =>
    this.#session.actions.verifyStepUpWithPasskeyPrf(input);
  verifyStepUpWithTotp: AuthSessionActions['verifyStepUpWithTotp'] = code =>
    this.#session.actions.verifyStepUpWithTotp(code);
  hasRole: AuthSessionActions['hasRole'] = role => this.#session.actions.hasRole(role);
  hasScopedRole: AuthSessionActions['hasScopedRole'] = role =>
    this.#session.actions.hasScopedRole(role);
  markSignedIn: AuthSessionActions['markSignedIn'] = () =>
    this.#session.actions.markSignedIn();

  /** Stops the session. Pending `whenSettled()` calls resolve with the last state. */
  destroy() {
    [...this.#pendingSettles].forEach(abandon => abandon());
    this.#unsubscribe();
    this.#session.destroy();
  }
}

/**
 * Creates the session for an application. In the browser it is read straight
 * away. Create one per application (one per request when rendering on a
 * server), and hand it to the screens with `setSeamlessAuth`.
 */
export function createSeamlessAuth(config: SeamlessAuthConfig): SeamlessAuth {
  return new SeamlessAuth(config);
}
