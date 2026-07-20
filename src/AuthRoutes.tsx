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
import OAuthCallback from '@/views/OAuthCallback';
import MagicLinkSent from './components/MagicLinkSent';
import { authRoutePaths } from './routes';

export const AuthRoutes = () => (
  <Routes>
    <Route path={authRoutePaths.login} element={<Login />} />
    <Route path={authRoutePaths.passkeyLogin} element={<PassKeyLogin />} />
    <Route path={authRoutePaths.verifyPhoneOtp} element={<PhoneRegistration />} />
    <Route path={authRoutePaths.verifyEmailOtp} element={<EmailRegistration />} />
    <Route path={authRoutePaths.verifyMagicLink} element={<VerifyMagicLink />} />
    <Route path={authRoutePaths.oauthCallback} element={<OAuthCallback />} />
    <Route path={authRoutePaths.registerPasskey} element={<PasskeyRegistration />} />
    <Route path={authRoutePaths.magicLinkSent} element={<MagicLinkSent />} />
    <Route path="*" element={<Navigate to={authRoutePaths.login} replace />} />
  </Routes>
);
