import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PassKeyLogin from '../src/PassKeyLogin';

// 🧠 Mock react-router navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// 🧠 Mock AuthProvider + InternalAuthContext
const mockValidateToken = jest.fn();
jest.mock('@/AuthProvider', () => ({
  useAuth: () => ({ apiHost: 'https://api.example.com' }),
}));
jest.mock('@/context/InternalAuthContext', () => ({
  useInternalAuth: () => ({ validateToken: mockValidateToken }),
}));

const mockStartAuthentication = jest.fn();
jest.mock('@simplewebauthn/browser', () => ({
  startAuthentication: (...args: any[]) => mockStartAuthentication(...args),
}));

jest.mock(
  '../src/styles/passKeyLogin.module.css',
  () => new Proxy({}, { get: (_, key) => key })
);

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  });
});

describe('PassKeyLogin', () => {
  it('renders title and button', () => {
    render(<PassKeyLogin />);
    expect(screen.getByText(/Login with Passkey/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Use Passkey/i })).toBeInTheDocument();
  });

  it('handles successful passkey authentication flow', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'abc' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Success', token: 'token123' }),
      });

    mockStartAuthentication.mockResolvedValueOnce({ credential: 'xyz' });

    render(<PassKeyLogin />);
    fireEvent.click(screen.getByRole('button', { name: /Use Passkey/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/webAuthn/login/start',
        expect.objectContaining({ method: 'POST' })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/webAuthn/login/finish',
        expect.objectContaining({ method: 'POST' })
      );
      expect(mockValidateToken).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('navigates to /mfaLogin when no token returned', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Success' }), // no token field
      });

    mockStartAuthentication.mockResolvedValueOnce({ credential: 'xyz' });

    render(<PassKeyLogin />);
    fireEvent.click(screen.getByRole('button', { name: /Use Passkey/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('logs error if initial request fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    render(<PassKeyLogin />);
    fireEvent.click(screen.getByRole('button', { name: /Use Passkey/i }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Passkey login error');
    });

    consoleSpy.mockRestore();
  });

  it('logs error if verify-authentication fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'abc' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

    mockStartAuthentication.mockResolvedValueOnce({ credential: 'xyz' });

    render(<PassKeyLogin />);
    fireEvent.click(screen.getByRole('button', { name: /Use Passkey/i }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Passkey login error');
    });

    consoleSpy.mockRestore();
  });

  it('handles caught exception in handlePasskeyLogin', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockStartAuthentication.mockRejectedValueOnce(new Error('webauthn failed'));

    render(<PassKeyLogin />);
    fireEvent.click(screen.getByRole('button', { name: /Use Passkey/i }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Passkey login error');
    });

    consoleSpy.mockRestore();
  });
});
