/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import React from 'react';

import AuthenticatorAppSettings from '@/components/AuthenticatorAppSettings';
import PasskeyManagement from '@/components/PasskeyManagement';
import RecoveryCodeSettings from '@/components/RecoveryCodeSettings';
import RecoveryRequests from '@/components/RecoveryRequests';

/**
 * A signed-in account settings panel: passkeys, authenticator app, recovery codes
 * and open recovery requests. Each section is also exported on its own.
 */
export const AccountSecurity: React.FC = () => (
  <div>
    <PasskeyManagement />
    <AuthenticatorAppSettings />
    <RecoveryCodeSettings />
    <RecoveryRequests />
  </div>
);

export default AccountSecurity;
