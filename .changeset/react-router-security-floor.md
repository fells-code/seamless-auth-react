---
'@seamless-auth/react': patch
---

Raise the `react-router-dom` v7 peer floor to `^7.15.1` to steer adopters off versions affected by a high-severity advisory (GHSA in react-router's vendored turbo-stream, affecting react-router 7.0.0 through 7.15.0). React Router 6 is unaffected, so the `^6.4.0` range is unchanged.

This is a peer range change, so adopters on a vulnerable v7 (7.0.0 to 7.15.0) will see an npm warning until they upgrade to 7.15.1 or later. No SDK code change and no runtime behavior change.
