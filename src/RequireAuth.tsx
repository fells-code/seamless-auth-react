import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "./AuthProvider";

export const RequireAuth = ({
  onAuthSuccess,
}: {
  onAuthSuccess: () => void;
}) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      onAuthSuccess();
    }

    if (!loading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, loading, navigate, onAuthSuccess]);

  return null;
};
