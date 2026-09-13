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
under the adapter's mount (`/auth/sessions`) is sent as an adapter call:

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
the link has been opened anywhere. If the app also receives the link as a
universal link, call `client.verifyMagicLink(token)` and then
`checkMagicLink()`.

### OAuth

`startOAuthLogin({ providerId, redirectUri })` returns the provider URL; open
it with `ports.oauthRedirect.open(url, redirectUri)`, which resolves with the
callback's `code` and `state`, and finish with `finishOAuthLogin`.
`redirectUri` must be registered with the provider and allowed by the auth API.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
