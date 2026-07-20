/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Login from '@/views/Login';
import PassKeyLogin from '@/views/PassKeyLogin';
import PasskeyRegistration from '@/views/PassKeyRegistration';
import PhoneRegistration from '@/views/PhoneRegistration';
import EmailRegistration from '@/views/EmailRegistration';
import VerifyMagicLink from '@/views/VerifyMagicLink';
import OAuthCallback from '@/views/OAuthCallback';
import MagicLinkSent from './components/MagicLinkSent';
import { authRoutePaths, legacyAuthRouteAliases } from './routes';

/**
 * Forwards a superseded path to its canonical one. Search, hash, and router
 * state are carried over because these screens depend on them, for example the
 * magic-link token in `?token=` and the identifier passed to the sent screen.
 */
const LegacyRouteRedirect = ({ to }: { to: string }) => {
  const location = useLocation();

  return (
    <Navigate
      to={{ pathname: to, search: location.search, hash: location.hash }}
      state={location.state}
      replace
    />
  );
};

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

    {legacyAuthRouteAliases.map(({ from, to }) => (
      <Route key={from} path={from} element={<LegacyRouteRedirect to={to} />} />
    ))}

    <Route path="*" element={<Navigate to={authRoutePaths.login} replace />} />
  </Routes>
);
