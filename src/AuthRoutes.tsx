import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./Login";
import MfaLogin from "./MfaLogin";
import PassKeyLogin from "./PassKeyLogin";
import RegisterPasskey from "./RegisterPassKey";
import VerifyOTP from "./VerifyOTP";

export const AuthRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/passKeyLogin" element={<PassKeyLogin />} />
    <Route path="/mfaLogin" element={<MfaLogin />} />
    <Route path="/verifyOTP" element={<VerifyOTP />} />
    <Route path="/registerPasskey" element={<RegisterPasskey />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);
