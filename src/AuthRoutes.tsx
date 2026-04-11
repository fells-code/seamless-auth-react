/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

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
    <Route path="/magiclinks-sent" element={<MagicLinkSent />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);
