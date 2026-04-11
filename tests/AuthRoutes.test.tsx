/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { AuthRoutes } from '../src/AuthRoutes';

jest.mock('@/views/Login', () => () => <div>Login Page</div>);
jest.mock('@/views/PassKeyLogin', () => () => <div>Passkey Login Page</div>);
jest.mock('@/views/PassKeyRegistration', () => () => <div>Register Passkey Page</div>);
jest.mock('@/views/PhoneRegistration', () => () => <div>Verify Phone Page</div>);

describe('AuthRoutes', () => {
  it('renders Login page on /login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders Passkey Login page on /passKeyLogin', () => {
    render(
      <MemoryRouter initialEntries={['/passKeyLogin']}>
        <AuthRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText('Passkey Login Page')).toBeInTheDocument();
  });

  it('renders Register Passkey page on /registerPasskey', () => {
    render(
      <MemoryRouter initialEntries={['/registerPasskey']}>
        <AuthRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText('Register Passkey Page')).toBeInTheDocument();
  });

  it('renders Phone OTP page on /verifyPhoneOTP', () => {
    render(
      <MemoryRouter initialEntries={['/verifyPhoneOTP']}>
        <AuthRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText('Verify Phone Page')).toBeInTheDocument();
  });

  it('redirects unknown routes to /login', () => {
    render(
      <MemoryRouter initialEntries={['/some/unknown/route']}>
        <AuthRoutes />
      </MemoryRouter>
    );

    expect(screen.getByText(/Login Redirect Target|Login Page/i)).toBeInTheDocument();
  });
});
