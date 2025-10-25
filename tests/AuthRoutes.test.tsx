import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { AuthRoutes } from '../src/AuthRoutes';

jest.mock('@/Login', () => () => <div>Login Page</div>);
jest.mock('@/MfaLogin', () => () => <div>MFA Login Page</div>);
jest.mock('@/PassKeyLogin', () => () => <div>Passkey Login Page</div>);
jest.mock('@/RegisterPassKey', () => () => <div>Register Passkey Page</div>);
jest.mock('@/VerifyOTP', () => () => <div>Verify OTP Page</div>);

describe('AuthRoutes', () => {
  it('renders Login page on /login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders MFA Login page on /mfaLogin', () => {
    render(
      <MemoryRouter initialEntries={['/mfaLogin']}>
        <AuthRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText('MFA Login Page')).toBeInTheDocument();
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

  it('renders Verify OTP page on /verifyOTP', () => {
    render(
      <MemoryRouter initialEntries={['/verifyOTP']}>
        <AuthRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText('Verify OTP Page')).toBeInTheDocument();
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
