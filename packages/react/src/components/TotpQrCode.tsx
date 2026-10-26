/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { qrCode } from '@seamless-auth/client';
import React, { useMemo } from 'react';

import styles from '@/styles/totp.module.css';

interface TotpQrCodeProps {
  value: string;
}

const TotpQrCode: React.FC<TotpQrCodeProps> = ({ value }) => {
  const code = useMemo(() => {
    try {
      return qrCode(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!code) return null;

  // The light background is fixed rather than themed: scanners need dark
  // modules on a light field, so a dark theme must not invert it.
  return (
    <svg
      role="img"
      aria-label="QR code for your authenticator app"
      className={styles.qr}
      viewBox={`0 0 ${code.size} ${code.size}`}
      shapeRendering="crispEdges"
    >
      <rect width={code.size} height={code.size} fill="#ffffff" />
      <path d={code.path} fill="#000000" />
    </svg>
  );
};

export default TotpQrCode;
