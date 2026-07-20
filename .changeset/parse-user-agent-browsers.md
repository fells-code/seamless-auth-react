---
'@seamless-auth/react': patch
---

Improve browser detection used for passkey device labels. Opera, Vivaldi, Samsung Internet, and Brave are now identified instead of being reported as Chrome, and Chrome and Firefox on iOS are recognized through their `CriOS` and `FxiOS` tokens. Chromium derivatives are now matched before the generic chrome token, so the result no longer depends on check ordering.

Brave is detected through `navigator.brave` because it ships a user agent identical to Chrome's. Arc exposes no distinguishing marker and is still reported as chrome.
