/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { PasskeyMetadata } from '@seamless-auth/client';

/** The part of React Native's `Platform` this reads. */
export interface PlatformLike {
  OS: string;
  Version: string | number;
}

/**
 * The metadata a passkey enrolment records, from the platform rather than a
 * user agent string, which a native app does not have.
 *
 * ```ts
 * import { Platform } from 'react-native';
 * registerPasskey(describeDevice(Platform, 'My iPhone'));
 * ```
 */
export function describeDevice(
  platform: PlatformLike,
  friendlyName?: string
): PasskeyMetadata {
  const os =
    platform.OS === 'ios' ? 'iOS' : platform.OS === 'android' ? 'Android' : platform.OS;

  return {
    friendlyName: friendlyName ?? `${os} device`,
    platform: platform.OS,
    browser: 'native',
    deviceInfo: `${os} ${String(platform.Version)}`,
  };
}
