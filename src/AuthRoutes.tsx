import { Navigate, Route, Routes } from 'react-router-dom';

import Login from '@/views/Login';
import PassKeyLogin from '@/views/PassKeyLogin';
import PasskeyRegistration from '@/views/PassKeyRegistration';
import PhoneRegistration from '@/views/PhoneRegistration';
import EmailRegistration from '@/views/EmailRegistration';
import VerifyMagicLink from '@/views/VerifyMagicLink';
import MagicLinkSent from './components/MagicLinkSent';

export const AuthRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/passKeyLogin" element={<PassKeyLogin />} />
    <Route path="/verifyPhoneOTP" element={<PhoneRegistration />} />
    <Route path="/verifyEmailOTP" element={<EmailRegistration />} />
    <Route path="/verify-magiclink" element={<VerifyMagicLink />} />
    <Route path="/registerPasskey" element={<PasskeyRegistration />} />
    <Route path="/magic-link-sent" element={<MagicLinkSent />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);
