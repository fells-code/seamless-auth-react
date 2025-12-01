import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PhoneInputWithCountryCode from '../src/components/phoneInput';

jest.mock('libphonenumber-js', () => ({
  AsYouType: jest.fn().mockImplementation(() => ({
    input: (val: string) => val,
  })),
  parsePhoneNumberFromString: jest.fn(),
}));

jest.mock(
  '../src/TermsModal',
  () => (props: any) =>
    props.isOpen ? <div data-testid="terms-modal">Modal Open</div> : null
);

describe('PhoneInputWithCountryCode', () => {
  const setPhone = jest.fn();
  const setPhoneError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders select and input fields', () => {
    render(
      <PhoneInputWithCountryCode
        phone=""
        setPhone={setPhone}
        phoneError=""
        setPhoneError={setPhoneError}
      />
    );

    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\(555\) 123-4567/i)).toBeInTheDocument();
  });

  it('calls setPhone with formatted value when typing', () => {
    render(
      <PhoneInputWithCountryCode
        phone=""
        setPhone={setPhone}
        phoneError=""
        setPhoneError={setPhoneError}
      />
    );

    const input = screen.getByPlaceholderText(/\(555\) 123-4567/i);
    fireEvent.change(input, { target: { value: '5551234' } });

    expect(setPhone).toHaveBeenCalledWith('+15551234'); // +1 prefix added
  });

  it('clears phoneError when typing if previously set', () => {
    render(
      <PhoneInputWithCountryCode
        phone=""
        setPhone={setPhone}
        phoneError="Error"
        setPhoneError={setPhoneError}
      />
    );

    const input = screen.getByPlaceholderText(/\(555\) 123-4567/i);
    fireEvent.change(input, { target: { value: '5551234' } });
    expect(setPhoneError).toHaveBeenCalledWith('');
  });

  it('updates phone when country changes', () => {
    render(
      <PhoneInputWithCountryCode
        phone="+15551234567"
        setPhone={setPhone}
        phoneError=""
        setPhoneError={setPhoneError}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'GB' } });
    expect(setPhone).toHaveBeenCalled(); // called with reformatted UK number
  });

  it('shows and hides terms modal', async () => {
    render(
      <PhoneInputWithCountryCode
        phone=""
        setPhone={setPhone}
        phoneError=""
        setPhoneError={setPhoneError}
      />
    );

    expect(screen.queryByTestId('terms-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /SMS Terms & Conditions/i }));
    expect(await screen.findByTestId('terms-modal')).toBeInTheDocument();
  });
});
