/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { PasskeyMetadata } from '../client/createSeamlessAuthClient';

type NavigatorWithBrave = Navigator & { brave?: unknown };

/**
 * A coarse platform and browser name for labelling a passkey. Reports
 * `unknown` outside a browser rather than throwing.
 */
export function parseUserAgent() {
  const nav: NavigatorWithBrave | undefined =
    typeof navigator === 'undefined' ? undefined : navigator;
  const ua = (nav?.userAgent ?? '').toLowerCase();

  let platform = 'unknown';
  let browser = 'unknown';

  if (/iphone|ipad|ipod/.test(ua)) platform = 'ios';
  else if (/android/.test(ua)) platform = 'android';
  else if (/mac os/.test(ua)) platform = 'mac';
  else if (/windows/.test(ua)) platform = 'windows';
  else if (/linux/.test(ua)) platform = 'linux';

  // Order matters: every Chromium derivative also carries a chrome token, so the
  // specific ones have to be tested first. Brave is only detectable through
  // navigator.brave because it ships a user agent identical to Chrome's. Arc
  // exposes no marker at all and is reported as chrome.
  if (nav?.brave) browser = 'brave';
  else if (/edg\/|edgios/.test(ua)) browser = 'edge';
  else if (/opr\/|opt\/|opera/.test(ua)) browser = 'opera';
  else if (/vivaldi/.test(ua)) browser = 'vivaldi';
  else if (/samsungbrowser/.test(ua)) browser = 'samsung';
  else if (/firefox|fxios/.test(ua)) browser = 'firefox';
  else if (/chrome|crios/.test(ua)) browser = 'chrome';
  else if (/safari/.test(ua)) browser = 'safari';

  const deviceInfo = `${platform} • ${browser}`;

  return { platform, browser, deviceInfo };
}

/**
 * Metadata for a passkey enrolled on this device. The credential still carries
 * a label, but asking for one put a form between the user and the browser
 * prompt they came for. The device it was enrolled on identifies it well enough
 * to rename later.
 */
export function passkeyMetadataForThisDevice(): PasskeyMetadata {
  const { platform, browser, deviceInfo } = parseUserAgent();

  return { friendlyName: deviceInfo, platform, browser, deviceInfo };
}
