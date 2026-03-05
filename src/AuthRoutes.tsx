import { Navigate, Route, Routes } from 'react-router-dom';

import Login from '@/Login';
import MfaLogin from '@/MfaLogin';
import PassKeyLogin from '@/PassKeyLogin';
import RegisterPasskey from '@/RegisterPassKey';
import VerifyPhoneOTP from '@/VerifyPhoneOTP';
import VerifyEmailOTP from './VerifyEmailOTP';
import VerifyMagicLink from './VerifyMagicLink';

export const AuthRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/passKeyLogin" element={<PassKeyLogin />} />
    <Route path="/mfaLogin" element={<MfaLogin />} />
    <Route path="/verifyPhoneOTP" element={<VerifyPhoneOTP />} />
    {/* TODO: change the name of this route and component to reflect what it does (sending magic links and polling?) */}
    <Route path="/verifyEmailOTP" element={<VerifyEmailOTP />} />
    <Route path="/verify-magiclink" element={<VerifyMagicLink />} />
    <Route path="/registerPasskey" element={<RegisterPasskey />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);
