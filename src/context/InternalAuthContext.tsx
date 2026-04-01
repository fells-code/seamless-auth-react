/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { createContext, Dispatch, ReactNode, SetStateAction, useContext } from 'react';

interface InternalAuthContextType {
  validateToken: () => Promise<void>;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

const InternalAuthContext = createContext<InternalAuthContextType | undefined>(undefined);

export const InternalAuthProvider = ({
  value,
  children,
}: {
  value: InternalAuthContextType;
  children: ReactNode;
}) => {
  return (
    <InternalAuthContext.Provider value={value}>{children}</InternalAuthContext.Provider>
  );
};

// This is internal. Do NOT export from index.ts
export const useInternalAuth = () => {
  const context = useContext(InternalAuthContext);
  if (!context) {
    throw new Error('useInternalAuth must be used within InternalAuthProvider');
  }
  return context;
};
