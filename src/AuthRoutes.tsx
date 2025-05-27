// AuthRoutes.tsx
import { useAuth } from "AuthProvider";
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./Login";
import MfaLogin from "./MfaLogin";
import PassKeyLogin from "./PassKeyLogin";
import RegisterPasskey from "./RegisterPassKey";
import VerifyOTP from "./VerifyOTP";

interface AuthRoutesProps {
  apiHost: string;
}

const AuthRoutes: React.FC<AuthRoutesProps> = ({ apiHost }) => {
  const { validateToken, setLoading } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={<Login setLoading={setLoading} apiHost={apiHost} />}
      />
      <Route
        path="/mfaLogin"
        element={<MfaLogin apiHost={apiHost} validateToken={validateToken} />}
      />
      <Route
        path="/passKeyLogin"
        element={
          <PassKeyLogin validateToken={validateToken} apiHost={apiHost} />
        }
      />
      <Route path="/verifyOTP" element={<VerifyOTP apiHost={apiHost} />} />
      <Route
        path="/registerPasskey"
        element={
          <RegisterPasskey validateToken={validateToken} apiHost={apiHost} />
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AuthRoutes;
