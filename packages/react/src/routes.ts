/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// The bundled screens are the only part of the package that needs
// react-router-dom, so they ship from their own entry. An application that
// renders its own auth UI (a Next.js app, for one) never resolves the router.
export { AuthRoutes } from '@/AuthRoutes';
