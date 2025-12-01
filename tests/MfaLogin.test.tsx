import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MfaLogin from '../src/MfaLogin';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockValidateToken = jest.fn();
jest.mock('@/AuthProvider', () => ({
  useAuth: () => ({ apiHost: 'https://api.example.com' }),
}));
jest.mock('@/context/InternalAuthContext', () => ({
  useInternalAuth: () => ({ validateToken: mockValidateToken }),
}));

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  });
});

describe('MfaLogin', () => {
  it('renders MFA options', () => {
    render(<MfaLogin />);
    expect(screen.getByText(/Multi-factor Authentication/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Send code to phone/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Send code to email/i })
    ).toBeInTheDocument();
  });

  it('sends phone OTP when clicking phone button', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    render(<MfaLogin />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send code to phone/i }));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/otp/generate-login-phone-otp',
        expect.objectContaining({ method: 'GET' })
      );
      expect(screen.getByText(/Verification SMS has been sent/i)).toBeInTheDocument();
    });
  });

  it('sends email OTP when clicking email button', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

    render(<MfaLogin />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send code to email/i }));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/otp/generate-login-email-otp',
        expect.objectContaining({ method: 'GET' })
      );
      expect(screen.getByText(/Verification email has been sent/i)).toBeInTheDocument();
    });
  });

  it('shows error if sendOTP fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    render(<MfaLogin />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send code to phone/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/Failed to send phone code/i)).toBeInTheDocument();
    });
  });

  it('verifies OTP successfully for email', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true }); // verify-login-email-otp

    render(<MfaLogin />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send code to email/i }));
    });

    // Step 2: Type OTP
    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText(/••••••/i), {
        target: { value: '123456' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/otp/verify-login-email-otp',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ verificationToken: '123456' }),
        })
      );
      expect(mockValidateToken).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error when OTP verification fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    render(<MfaLogin />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send code to phone/i }));
    });

    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText(/••••••/i), {
        target: { value: '111111' },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: /Verify/i }));

    await waitFor(() => {
      expect(screen.getByText(/Verification failed/i)).toBeInTheDocument();
    });
  });

  it('disables Verify button until OTP is 6 digits', async () => {
    render(<MfaLogin />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send code to phone/i }));
    });
    const verifyBtn = screen.getByRole('button', { name: /Verify/i });
    expect(verifyBtn).toBeDisabled();
  });
});
