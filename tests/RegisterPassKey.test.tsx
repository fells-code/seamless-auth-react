import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import RegisterPasskey from '@/RegisterPassKey';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockStartRegistration = jest.fn();
jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: (...args: any[]) => mockStartRegistration(...args),
  WebAuthnError: class WebAuthnError extends Error {
    code = 400;
    name = 'WebAuthnError';
  },
}));

const mockValidateToken = jest.fn();
jest.mock('@/AuthProvider', () => ({
  useAuth: () => ({ apiHost: 'https://api.example.com' }),
}));
jest.mock('@/context/InternalAuthContext', () => ({
  useInternalAuth: () => ({ validateToken: mockValidateToken }),
}));

jest.mock('../src/utils', () => ({
  isPasskeySupported: () => jest.fn().mockResolvedValue(true),
}));

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.resetAllMocks();
  global.fetch = jest.fn() as any;
});
afterEach(() => {
  // Restore the original console.error after each test
  consoleErrorSpy.mockRestore();
});
describe('RegisterPasskey', () => {
  it('renders UI when passkey support is true', async () => {
    await act(async () => {
      render(<RegisterPasskey />);
    });

    expect(screen.getByText(/Secure Your Account with a Passkey/i)).toBeInTheDocument();
  });

  it('handles successful passkey registration flow', async () => {
    (global.fetch as jest.Mock)
      // generate-registration-options
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'xyz' }),
      })
      // verify-registration
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verified: true }),
      });

    mockStartRegistration.mockResolvedValueOnce({ credential: 'abc' });

    await act(async () => {
      render(<RegisterPasskey />);
    });

    waitFor(async () => {
      const button = await screen.findByRole('button', { name: /Register Passkey/i });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/webAuthn/register/start',
        expect.objectContaining({ method: 'GET' })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/webAuthn/register/finish',
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(mockValidateToken).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(screen.getByText(/Passkey registered successfully/i)).toBeInTheDocument();
  });

  it('shows error when challenge request fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    await act(async () => {
      render(<RegisterPasskey />);
    });
    const button = await screen.findByRole('button', { name: /Register Passkey/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Something went wrong registering passkey/i)
      ).toBeInTheDocument();
    });
  });

  it('shows error if startRegistration throws WebAuthnError', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ challenge: 'xyz' }),
    });
    mockStartRegistration.mockRejectedValueOnce(
      new (require('@simplewebauthn/browser').WebAuthnError)('Failure')
    );

    await act(async () => {
      render(<RegisterPasskey />);
    });
    const button = await screen.findByRole('button', { name: /Register Passkey/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Error: WebAuthnError/i)).toBeInTheDocument();
    });
  });

  it('handles unexpected error in registration flow', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network down'));

    await act(async () => {
      render(<RegisterPasskey />);
    });
    const button = await screen.findByRole('button', { name: /Register Passkey/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Something went wrong registering passkey/i)
      ).toBeInTheDocument();
    });
  });
});
