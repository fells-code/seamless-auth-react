# @seamless-auth/react-native

The React Native binding for Seamless Auth. Headless: an `AuthProvider`, the
hooks a screen needs, and the native ports for passkeys, secure token storage,
and in-app browser OAuth. You bring the screens; the flows, session state, and
token custody come from `@seamless-auth/client`.

The app talks to your backend's Seamless Auth server adapter (the same `/auth`
mount your web app uses) over bearer transport: the client holds the auth
API's tokens, presents the right one on each request, keeps the pair in the
platform keystore between launches, and refreshes through `POST /auth/refresh`
when the access token expires. Your backend needs `@seamless-auth/express` or
`@seamless-auth/fastify` 0.16 or later, and its own routes accept the same
access token once `requireAuth` is given `authServerUrl` and `audience`.

## Start here

New to Seamless Auth? The [self-hosted quickstart](https://docs.seamlessauth.com/start/quickstart/) runs the full stack locally with Docker. If Seamless hosts your auth instance, follow the [managed quickstart](https://docs.seamlessauth.com/start/managed-quickstart/) instead. The [compatibility matrix](https://docs.seamlessauth.com/build/ecosystem/#compatibility-matrix) lists which package versions work together.

## Install

```bash
npx expo install @seamless-auth/react-native expo-secure-store react-native-passkeys expo-web-browser
```

`expo-secure-store`, `react-native-passkeys` and `expo-web-browser` are not
dependencies of this package. Each port takes the module as a parameter, so an
app that does not use OAuth, for example, never installs `expo-web-browser` and
Metro never looks for it.

## Wire it up

```tsx
import * as Passkeys from 'react-native-passkeys';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import {
  AuthProvider,
  createNativePasskeyPort,
  createSecureStoreTokenStorage,
  createWebBrowserOAuthRedirect,
} from '@seamless-auth/react-native';

const ports = {
  passkeys: createNativePasskeyPort(Passkeys),
  tokenStorage: createSecureStoreTokenStorage(SecureStore),
  oauthRedirect: createWebBrowserOAuthRedirect(WebBrowser),
};

export default function App() {
  return (
    <AuthProvider apiHost={process.env.EXPO_PUBLIC_API_URL!} ports={ports}>
      <Screens />
    </AuthProvider>
  );
}
```

Build `ports` once, at module scope or in a `useMemo`: the provider keys its
session on the port identities.

On an Android emulator the host machine is `http://10.0.2.2:<port>`, not
`localhost`.

## Use it

```tsx
import {
  useAuth,
  useAuthClient,
  useLoginMethods,
  usePasskeySupport,
} from '@seamless-auth/react-native';

function SignIn() {
  const { login, handlePasskeyLogin, isAuthenticated, loading } = useAuth();
  const client = useAuthClient();
  const { loginMethods } = useLoginMethods();
  const { passkeySupported } = usePasskeySupport();

  const start = async (identifier: string) => {
    const { data, error } = await login(identifier, passkeySupported);
    if (error) return;

    if (passkeySupported && data.loginMethods?.includes('passkey')) {
      const passkey = await handlePasskeyLogin();
      if (!passkey.error) return;
    }

    await client.requestLoginEmailOtp();
    // navigate to your code screen; then client.verifyLoginEmailOtp(code)
  };
  // ...
}
```

`useAuthorizedFetch()` is a fetch for your own API that carries the access
token and refreshes it once on a 401; a path resolves on `apiHost`, and a path
under the adapter's mount (`/auth/sessions`) is sent as an adapter call. The
token goes only to `apiHost` and the origins in the provider's `trustedOrigins`
prop; any other origin rejects with `UntrustedOriginError` before anything is
sent. A response that a redirect took to any other origin rejects with
`UntrustedRedirectError`, and the client never follows such a redirect itself.
React Native's `fetch` follows redirects before the client sees the response,
though, so this detects a redirect to another origin after it happened rather
than preventing it, and the token may already have been sent on that hop:

```ts
const authorizedFetch = useAuthorizedFetch();
const plan = await authorizedFetch('/api/plan/mine').then(r => r.json());
```

`useAuth()` carries the session state and actions (`user`, `credentials`,
`isAuthenticated`, `loading`, `logout`, `refreshSession`, `registerPasskey`,
step-up and organization helpers) and `useAuthClient()` returns the headless
client for the multi-step flows. The client is the same instance the session
drives, which is what carries a sign-in from `/login` through its OTP or
passkey step.

Every method returns a `SeamlessAuthResult`: `{ data, error: null }` or
`{ data: null, error }`. Nothing throws for a failed request.

### Passkeys

Native passkeys need the relying party to be an associated domain of the app:
`apple-app-site-association` (`webcredentials`) and `assetlinks.json` hosted
over HTTPS on the RP ID domain, an `associatedDomains` entitlement on iOS, and
the app's signing certificate hash in the auth API's `ORIGINS` as
`android:apk-key-hash:<base64url>` on Android. There is no `localhost`
exemption on either platform. OTP and magic link work without any of that.

`registerPasskey(describeDevice(Platform, 'My phone'))` records the device
rather than a user agent.

### Magic links

Request one with `client.requestMagicLink()`, then poll
`client.checkMagicLink()` every few seconds; the poll returns the session once
the link has been used. If the app also receives the link as a universal link,
call `client.verifyMagicLink(token)` and then `checkMagicLink()`. Bearer mode
sends the sign-in's ephemeral token with the verify call, which is how the API
knows this is the device that asked for the link.

Opened on any other device, the link is not used until someone there approves
it: `verifyMagicLink` fails with an error `getMagicLinkConfirmation(error)`
recognises, carrying the requesting device's platform and request time
(`magicLinkConfirmationPrompt(held)` phrases both). If the app handles links it
did not ask for, show that and call `confirmMagicLinkSignIn({ client, token })`
only when the person agrees. The requesting device is then signed in by its
poll, and this one is not.

### OAuth

`startOAuthLogin({ providerId, redirectUri })` returns the provider URL; open
it with `ports.oauthRedirect.open(url, redirectUri)`, which resolves with the
callback's `code` and `state`, and finish with `finishOAuthLogin`.
`redirectUri` must be registered with the provider and allowed by the auth API.
The port opens only an `https` authorization URL (`http` only on a loopback
host) and otherwise throws `UnsafeAuthorizationUrlError` without opening a
browser.

Newer auth servers also return a `binding` from `startOAuthLogin` and refuse a
callback without it. The session actions keep it in memory with its `state` and
send it from `finishOAuthLogin`, so this needs nothing from you. If you finish
with another client, pass `binding` yourself, and check that the callback's
`state` matches the one `startOAuthLogin` returned. Never put the binding in a
URL or send it to the provider.

## License

Apache-2.0. See [LICENSE](LICENSE).
