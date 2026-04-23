/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PassKeyLogin from '../src/views/PassKeyLogin';

const mockNavigate = jest.fn();
const mockHandlePasskeyLogin = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@/AuthProvider', () => ({
  useAuth: () => ({
    handlePasskeyLogin: mockHandlePasskeyLogin,
  }),
}));

jest.mock(
  '../src/styles/passKeyLogin.module.css',
  () => new Proxy({}, { get: (_, key) => key })
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PassKeyLogin', () => {
  it('renders title and button', () => {
    render(<PassKeyLogin />);

    expect(screen.getByText(/login with passkey/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use passkey/i })).toBeInTheDocument();
  });

  it('navigates home when passkey login succeeds', async () => {
    mockHandlePasskeyLogin.mockResolvedValueOnce(true);

    render(<PassKeyLogin />);
    fireEvent.click(screen.getByRole('button', { name: /use passkey/i }));

    await waitFor(() => {
      expect(mockHandlePasskeyLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows an error when passkey login cannot be completed', async () => {
    mockHandlePasskeyLogin.mockResolvedValueOnce(false);

    render(<PassKeyLogin />);
    fireEvent.click(screen.getByRole('button', { name: /use passkey/i }));

    expect(
      await screen.findByText(/passkey sign-in could not be completed/i)
    ).toBeInTheDocument();
  });
});
