import { useEffect, useRef } from "react";

import { useAuth } from "./AuthProvider";
import AuthRoutes from "./AuthRoutes";

interface AuthRoutesProps {
  apiHost: string;
}

export const SlotWrapper: React.FC<AuthRoutesProps> = ({ apiHost }) => {
  const { isAuthenticated, loading } = useAuth();
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && slotRef.current) {
      // Make the slot visible
      slotRef.current.style.display = "block";
    }
  }, [isAuthenticated]);

  if (loading) return null;

  return (
    <>
      {!isAuthenticated && <AuthRoutes apiHost={apiHost} />}
      <div ref={slotRef} style={{ display: "none" }}>
        <slot />
      </div>
    </>
  );
};
