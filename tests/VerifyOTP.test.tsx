import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VerifyOTP from '../src/VerifyOTP';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../src/AuthProvider', () => ({
  useAuth: () => ({ apiHost: 'https://api.example.com/' }),
}));

jest.mock(
  '../src/styles/verifyOTP.module.css',
  () => new Proxy({}, { get: (_, key) => key })
);

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn();
  localStorage.clear();
});

describe('VerifyOTP Component', () => {
  it('renders the form with expected fields', () => {
    render(<VerifyOTP />);
    expect(screen.getByText(/Verify Your Contact Info/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Verification Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Verification Code/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Verify & Continue/i })
    ).toBeInTheDocument();
  });

  it('shows error if OTPs are not 6 digits on submit', async () => {
    render(<VerifyOTP />);
    fireEvent.submit(screen.getByRole('button', { name: /Verify & Continue/i }));
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid code/i)).toBeInTheDocument();
    });
  });

  it('verifies both email and phone when valid OTPs are entered', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // email verify
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // phone verify

    render(<VerifyOTP />);

    fireEvent.change(screen.getByLabelText(/Email Verification Code/i), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText(/Phone Verification Code/i), {
      target: { value: '654321' },
    });

    fireEvent.submit(screen.getByRole('button', { name: /Verify & Continue/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/otp/verify-email-otp',
        expect.objectContaining({ method: 'POST' })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/otp/verify-phone-otp',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('shows error when verification fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) }) // email verify
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) }); // phone verify

    render(<VerifyOTP />);

    fireEvent.change(screen.getByLabelText(/Email Verification Code/i), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText(/Phone Verification Code/i), {
      target: { value: '654321' },
    });

    fireEvent.submit(screen.getByRole('button', { name: /Verify & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Verification failed/i)).toBeInTheDocument();
    });
  });

  it('resends email OTP and updates message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'new-token' }),
    });

    render(<VerifyOTP />);

    fireEvent.click(screen.getByRole('button', { name: /Resend code to email/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/otp/generate-email-otp',
        expect.objectContaining({ method: 'GET' })
      );
      expect(screen.getByText(/Verification email has been resent/i)).toBeInTheDocument();
    });
  });

  it('resends phone OTP and updates message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'new-token' }),
    });

    render(<VerifyOTP />);

    fireEvent.click(screen.getByRole('button', { name: /Resend code to phone/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/otp/generate-phone-otp',
        expect.objectContaining({ method: 'GET' })
      );
      expect(screen.getByText(/Verification SMS has been resent/i)).toBeInTheDocument();
    });
  });

  it('navigates to /registerPasskey when both verifications succeed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<VerifyOTP />);

    fireEvent.change(screen.getByLabelText(/Email Verification Code/i), {
      target: { value: '111111' },
    });
    fireEvent.change(screen.getByLabelText(/Phone Verification Code/i), {
      target: { value: '222222' },
    });

    fireEvent.submit(screen.getByRole('button', { name: /Verify & Continue/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/registerPasskey');
    });
  });
});
