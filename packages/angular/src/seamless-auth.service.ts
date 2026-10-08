/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  type Signal,
} from '@angular/core';
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
import { distinctUntilChanged, map, Observable } from 'rxjs';

import { SEAMLESS_AUTH_CONFIG, type SeamlessAuthPorts } from './config';

/**
 * Session state and auth actions for an Angular application.
 *
 * A thin binding over the framework-agnostic session store in
 * `@seamless-auth/client`: the store owns the state machine, and this exposes
 * it as signals and observables. Configure it with `provideSeamlessAuth`.
 */
@Injectable({ providedIn: 'root' })
export class SeamlessAuth {
  private readonly config = inject(SEAMLESS_AUTH_CONFIG);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly session: AuthSession;
  private readonly stateSignal: ReturnType<typeof signal<AuthSessionState>>;

  /** The platform ports the bundled screens go through. */
  readonly ports: SeamlessAuthPorts;

  /** Everything the session knows. Replaced wholesale on every change. */
  readonly state: Signal<AuthSessionState>;
  readonly user: Signal<AuthSessionState['user']>;
  readonly isAuthenticated: Signal<boolean>;
  /** True until the session has been read. Guards wait on this. */
  readonly loading: Signal<boolean>;
  readonly credentials: Signal<AuthSessionState['credentials']>;
  readonly organizations: Signal<AuthSessionState['organizations']>;
  readonly activeOrganization: Signal<AuthSessionState['activeOrganization']>;
  readonly stepUpStatus: Signal<AuthSessionState['stepUpStatus']>;
  readonly hasSignedInBefore: Signal<boolean>;

  /** The state as an observable. Emits the current value on subscribe. */
  readonly state$: Observable<AuthSessionState>;
  readonly user$: Observable<AuthSessionState['user']>;
  readonly isAuthenticated$: Observable<boolean>;

  private readonly loginMethodsSignal = signal<LoginMethod[] | null>(null);
  private readonly loginMethodsLoadingSignal = signal(true);
  private loginMethodsRequest: Promise<LoginMethod[] | null> | null = null;

  private readonly passkeySupportedSignal = signal(false);
  private readonly passkeySupportLoadingSignal = signal(true);
  private passkeySupportRequest: Promise<boolean> | null = null;

  /**
   * Sign-in methods this instance has enabled, once `loadLoginMethods()` has
   * answered. Null means unknown, never "none".
   */
  readonly loginMethods = this.loginMethodsSignal.asReadonly();
  readonly loginMethodsLoading = this.loginMethodsLoadingSignal.asReadonly();
  /** Whether this device can use a passkey, once `checkPasskeySupport()` has answered. */
  readonly passkeySupported = this.passkeySupportedSignal.asReadonly();
  readonly passkeySupportLoading = this.passkeySupportLoadingSignal.asReadonly();

  constructor() {
    const config = this.config;

    this.ports = {
      passkeys: config.ports?.passkeys ?? createBrowserPasskeyPort(),
      oauthRedirect: config.ports?.oauthRedirect ?? createBrowserOAuthRedirect(),
    };

    this.session = createAuthSession({
      apiHost: config.apiHost,
      magicLinkRedirectUri: config.magicLinkRedirectUri,
      // Cookie transport only. `mode` is deliberately not configurable here, so
      // no token is ever handed to page scripts.
      transport: { basePath: config.basePath, fetch: config.fetch },
      passkeys: this.ports.passkeys,
      detectPreviousSignIn: config.autoDetectPreviousSignIn ?? true,
      initialSession: config.initialSession,
      // A server render has no browser storage to read, and must not share a
      // previous sign-in flag between requests.
      storage: this.isBrowser ? undefined : createMemoryStorage(),
    });

    const session = this.session;
    // A server render shows what the server knows. The browser reads the rest
    // as soon as it runs.
    const read = this.isBrowser ? session.getState : session.getServerState;

    this.stateSignal = signal(read());
    this.state = this.stateSignal.asReadonly();
    const unsubscribe = session.subscribe(() => this.stateSignal.set(read()));

    // Unlike a React provider, the injector that owns this service is destroyed
    // exactly once, so the store can be torn down with it.
    inject(DestroyRef).onDestroy(() => {
      unsubscribe();
      session.destroy();
    });

    this.user = computed(() => this.state().user);
    this.isAuthenticated = computed(() => this.state().isAuthenticated);
    this.loading = computed(() => this.state().loading);
    this.credentials = computed(() => this.state().credentials);
    this.organizations = computed(() => this.state().organizations);
    this.activeOrganization = computed(() => this.state().activeOrganization);
    this.stepUpStatus = computed(() => this.state().stepUpStatus);
    this.hasSignedInBefore = computed(() => this.state().hasSignedInBefore);

    this.state$ = new Observable<AuthSessionState>(subscriber => {
      subscriber.next(read());
      return session.subscribe(() => subscriber.next(read()));
    });
    this.user$ = this.state$.pipe(
      map(state => state.user),
      distinctUntilChanged()
    );
    this.isAuthenticated$ = this.state$.pipe(
      map(state => state.isAuthenticated),
      distinctUntilChanged()
    );

    if (this.isBrowser) {
      void this.refreshSession({ background: config.initialSession !== undefined });
    }
  }

  /** The client behind the session, for calls the session does not wrap. */
  get client(): SeamlessAuthClient {
    return this.session.client;
  }

  /** Where the bundled screens go once someone is signed in. */
  get signedInPath(): string {
    return this.config.signedInPath ?? '/';
  }

  /** Where `requireAuth` sends someone who is signed out. */
  get loginPath(): string {
    return this.config.loginPath ?? '/login';
  }

  /**
   * A fetch for the application's own API that carries the session cookies. A
   * path resolves on `apiHost`. For `HttpClient`, use `seamlessAuthInterceptor`.
   */
  readonly authorizedFetch: SeamlessAuthClient['authorizedFetch'] = (input, init) =>
    this.session.client.authorizedFetch(input, init);

  /**
   * Resolves with the state once the session has been read. During a server
   * render the session is never read there, so this resolves at once with what
   * the server knows (`loading` stays true without an `initialSession`).
   */
  whenSettled(): Promise<AuthSessionState> {
    const current = this.state();

    if (!current.loading || !this.isBrowser) {
      return Promise.resolve(current);
    }

    return new Promise(resolve => {
      const unsubscribe = this.session.subscribe(() => {
        const next = this.session.getState();

        if (!next.loading) {
          unsubscribe();
          resolve(next);
        }
      });
    });
  }

  /** Reads the instance's sign-in methods once and caches the answer. */
  loadLoginMethods(): Promise<LoginMethod[] | null> {
    this.loginMethodsRequest ??= loadLoginMethods(this.session.client).then(methods => {
      this.loginMethodsSignal.set(methods);
      this.loginMethodsLoadingSignal.set(false);
      return methods;
    });

    return this.loginMethodsRequest;
  }

  /** Detects passkey support once and caches the answer. */
  checkPasskeySupport(): Promise<boolean> {
    this.passkeySupportRequest ??= (
      this.isBrowser ? detectPasskeySupport(this.ports.passkeys) : Promise.resolve(false)
    ).then(supported => {
      this.passkeySupportedSignal.set(supported);
      this.passkeySupportLoadingSignal.set(false);
      return supported;
    });

    return this.passkeySupportRequest;
  }

  readonly login: AuthSessionActions['login'] = (...args) =>
    this.session.actions.login(...args);
  readonly handlePasskeyLogin: AuthSessionActions['handlePasskeyLogin'] = () =>
    this.session.actions.handlePasskeyLogin();
  readonly registerPasskey: AuthSessionActions['registerPasskey'] = input =>
    this.session.actions.registerPasskey(input);
  readonly refreshSession: AuthSessionActions['refreshSession'] = options =>
    this.session.actions.refreshSession(options);
  readonly logout: AuthSessionActions['logout'] = () => this.session.actions.logout();
  readonly logoutAllSessions: AuthSessionActions['logoutAllSessions'] = () =>
    this.session.actions.logoutAllSessions();
  readonly deleteUser: AuthSessionActions['deleteUser'] = () =>
    this.session.actions.deleteUser();
  readonly updateCredential: AuthSessionActions['updateCredential'] = credential =>
    this.session.actions.updateCredential(credential);
  readonly deleteCredential: AuthSessionActions['deleteCredential'] = id =>
    this.session.actions.deleteCredential(id);
  readonly switchOrganization: AuthSessionActions['switchOrganization'] = id =>
    this.session.actions.switchOrganization(id);
  readonly listOAuthProviders: AuthSessionActions['listOAuthProviders'] = () =>
    this.session.actions.listOAuthProviders();
  readonly startOAuthLogin: AuthSessionActions['startOAuthLogin'] = input =>
    this.session.actions.startOAuthLogin(input);
  readonly finishOAuthLogin: AuthSessionActions['finishOAuthLogin'] = input =>
    this.session.actions.finishOAuthLogin(input);
  readonly refreshStepUpStatus: AuthSessionActions['refreshStepUpStatus'] = () =>
    this.session.actions.refreshStepUpStatus();
  readonly verifyStepUpWithPasskey: AuthSessionActions['verifyStepUpWithPasskey'] = () =>
    this.session.actions.verifyStepUpWithPasskey();
  readonly verifyStepUpWithPasskeyPrf: AuthSessionActions['verifyStepUpWithPasskeyPrf'] =
    input => this.session.actions.verifyStepUpWithPasskeyPrf(input);
  readonly verifyStepUpWithTotp: AuthSessionActions['verifyStepUpWithTotp'] = code =>
    this.session.actions.verifyStepUpWithTotp(code);
  readonly hasRole: AuthSessionActions['hasRole'] = role =>
    this.session.actions.hasRole(role);
  readonly hasScopedRole: AuthSessionActions['hasScopedRole'] = role =>
    this.session.actions.hasScopedRole(role);
  readonly markSignedIn: AuthSessionActions['markSignedIn'] = () =>
    this.session.actions.markSignedIn();
}
