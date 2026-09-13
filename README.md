# Seamless Auth client SDKs

This repository is an npm workspace that publishes the client-side packages for
[Seamless Auth](https://github.com/fells-code/seamless-auth-api):

| Package                                              | What it is                                                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`@seamless-auth/client`](packages/client/README.md) | Framework-agnostic core: the headless auth client, session store, result and error types.                |
| [`@seamless-auth/react`](packages/react/README.md)   | React binding: `AuthProvider`, hooks, and optional prebuilt auth screens. Depends on the client package. |

Most React applications only install `@seamless-auth/react`; it brings the client
core with it. The client package exists so that other bindings (React Native
next) share one implementation of the auth flows and session state instead of
re-implementing them.

## Working in this repository

```bash
npm install
npm run lint
npm test
npm run build
```

Tests run as one Jest project per package from the root. The React project
resolves `@seamless-auth/client` to the client package's source, so a change in
the core is exercised by the React suite without a build in between. Releases
are managed with Changesets; see [RELEASES.md](RELEASES.md) and
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
