/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import React from 'react';

import PasskeyManagement from '@/components/PasskeyManagement';
import RecoveryCodeSettings from '@/components/RecoveryCodeSettings';
import RecoveryRequests from '@/components/RecoveryRequests';

/**
 * A signed-in account settings panel: passkeys, recovery codes and open recovery
 * requests. Each section is also exported on its own.
 */
export const AccountSecurity: React.FC = () => (
  <div>
    <PasskeyManagement />
    <RecoveryCodeSettings />
    <RecoveryRequests />
  </div>
);

export default AccountSecurity;
