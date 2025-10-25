import { useEffect, useState } from 'react';

export function usePreviousSignIn(storageKey = 'seamlessauth_seen') {
  const [hasSignedInBefore, setHasSignedInBefore] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(storageKey);
      if (seen === 'true') setHasSignedInBefore(true);
    } catch {
      // silent fail if storage not available
    }
  }, [storageKey]);

  const markSignedIn = () => {
    try {
      localStorage.setItem(storageKey, 'true');
      setHasSignedInBefore(true);
    } catch {
      // ignore storage errors (e.g. private mode)
    }
  };

  return { hasSignedInBefore, markSignedIn };
}
