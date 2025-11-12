import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Login from '../src/Login';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockStartAuthentication = jest.fn();
jest.mock('@simplewebauthn/browser', () => ({
  startAuthentication: (...args: any[]) => mockStartAuthentication(...args),
}));

jest.mock('@/AuthProvider', () => ({
  useAuth: () => ({ apiHost: 'https://api.example.com' }),
}));

const mockValidateToken = jest.fn();
jest.mock('@/context/InternalAuthContext', () => ({
  useInternalAuth: () => ({ validateToken: mockValidateToken }),
}));

jest.mock('../src/utils', () => ({
  isPasskeySupported: () => jest.fn().mockResolvedValue(true),
  isValidEmail: () => jest.fn(email => email.includes('@')),
  isValidPhoneNumber: () => jest.fn(phone => phone.startsWith('+')),
}));

jest.mock('@/components/phoneInput', () => (props: any) => (
  <input
    data-testid="phone-input"
    value={props.phone}
    onChange={e => props.setPhone(e.target.value)}
  />
));

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn() as any;
});

describe('Login Component', () => {
  it('renders register mode by default', async () => {
    await act(async () => {
      render(<Login />);
    });

    expect(await screen.findByText('Create Account')).toBeInTheDocument();
  });

  it('toggles between register and login modes', async () => {
    await act(async () => {
      render(<Login />);
    });
    const toggleButton = screen.getByRole('button', { name: /Already have an account/i });
    fireEvent.click(toggleButton);
    expect(await screen.findByText('Sign In')).toBeInTheDocument();
  });

  it('submits register form successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Success' }),
    });

    await act(async () => {
      render(<Login />);
    });

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByTestId('phone-input'), {
      target: { value: '+15555555555' },
    });

    const submitButton = screen.getByRole('button', { name: /Register/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/registration/register',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@example.com',
            phone: '+15555555555',
          }),
        })
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/verifyOTP');
  });

  it('shows error when registration fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    await act(async () => {
      render(<Login />);
    });

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByTestId('phone-input'), {
      target: { value: '+15555555555' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /An unexpected error occured. Try again. If the problem persists, try resetting your password/i
        )
      ).toBeInTheDocument();
    });
  });

  it('handles login flow and successful passkey verification', async () => {
    (global.fetch as jest.Mock)
      // login API call
      .mockResolvedValueOnce({ ok: true })
      // generate-authentication-options
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      // verify-authentication
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Success', token: 'abc' }),
      });

    mockStartAuthentication.mockResolvedValueOnce({ credential: '123' });

    await act(async () => {
      render(<Login />);
    });

    // Switch to login mode
    fireEvent.click(screen.getByRole('button', { name: /Already have an account/i }));

    fireEvent.change(screen.getByLabelText(/Email Address \/ Phone Number/i), {
      target: { value: 'user@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/login',
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(mockValidateToken).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows error when login fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    await act(async () => {
      render(<Login />);
    });
    fireEvent.click(screen.getByRole('button', { name: /Already have an account/i }));

    fireEvent.change(screen.getByLabelText(/Email Address \/ Phone Number/i), {
      target: { value: 'user@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /An unexpected error occured. Try again. If the problem persists, try resetting your password/i
        )
      ).toBeInTheDocument()
    );
  });
});
