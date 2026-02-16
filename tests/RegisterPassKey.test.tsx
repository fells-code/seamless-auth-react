import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPasskey from '../src/RegisterPassKey';

const mockNavigate = jest.fn();
const mockValidateToken = jest.fn();
const mockFetch = jest.fn();
const mockStartRegistration = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@/AuthProvider', () => ({
  useAuth: () => ({
    apiHost: 'https://api.example.com',
    mode: 'server',
  }),
}));

jest.mock('@/context/InternalAuthContext', () => ({
  useInternalAuth: () => ({
    validateToken: mockValidateToken,
  }),
}));

jest.mock('@/fetchWithAuth', () => ({
  createFetchWithAuth: () => mockFetch,
}));

jest.mock('@/utils', () => ({
  isPasskeySupported: jest.fn().mockResolvedValue(true),
  parseUserAgent: jest.fn().mockReturnValue({
    platform: 'macOS',
    browser: 'Chrome',
    deviceInfo: 'MacBook Pro',
  }),
}));

jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: (...args: any[]) => mockStartRegistration(...args),
  WebAuthnError: class WebAuthnError extends Error {
    name = 'WebAuthnError';
  },
}));

// Mock modal so we control confirm manually
jest.mock('@/components/DeviceNameModal', () => (props: any) => {
  if (!props.isOpen) return null;
  return (
    <div>
      <button onClick={() => props.onConfirm('My Device')}>Confirm</button>
      <button onClick={props.onCancel}>Cancel</button>
    </div>
  );
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RegisterPasskey', () => {
  it('renders supported UI', async () => {
    render(<RegisterPasskey />);
    expect(await screen.findByText(/Secure Your Account/i)).toBeInTheDocument();
  });

  it('opens modal when clicking register', async () => {
    render(<RegisterPasskey />);

    const btn = await screen.findByText(/Register Passkey/i);
    fireEvent.click(btn);

    expect(await screen.findByText('Confirm')).toBeInTheDocument();
  });

  it('handles successful registration flow', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'xyz' }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    mockStartRegistration.mockResolvedValueOnce({
      id: 'cred',
    });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));
    fireEvent.click(await screen.findByText('Confirm'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/webAuthn/register/start',
        expect.any(Object)
      );
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/webAuthn/register/finish',
        expect.any(Object)
      );
    });

    expect(mockValidateToken).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('handles challenge failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));
    fireEvent.click(await screen.findByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText(/Error registering passkey/i)).toBeInTheDocument();
    });
  });

  it('handles WebAuthnError', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ challenge: 'xyz' }),
    });

    const { WebAuthnError } = require('@simplewebauthn/browser');
    mockStartRegistration.mockRejectedValueOnce(new WebAuthnError('Failure'));

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));
    fireEvent.click(await screen.findByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText(/Error registering passkey/i)).toBeInTheDocument();
    });
  });

  it('handles verification failure', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'xyz' }),
      })
      .mockResolvedValueOnce({
        ok: false,
      });

    mockStartRegistration.mockResolvedValueOnce({});

    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));
    fireEvent.click(await screen.findByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText(/Error registering passkey/i)).toBeInTheDocument();
    });
  });

  it('handles canceling modal', async () => {
    render(<RegisterPasskey />);

    fireEvent.click(await screen.findByText(/Register Passkey/i));
    fireEvent.click(await screen.findByText('Cancel'));

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });
});
