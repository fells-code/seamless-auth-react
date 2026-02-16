import { render, screen, fireEvent } from '@testing-library/react';
import DeviceNameModal from '@/components/DeviceNameModal';

describe('DeviceNameModal', () => {
  const mockCancel = jest.fn();
  const mockConfirm = jest.fn();

  const renderModal = (isOpen = true) =>
    render(
      <DeviceNameModal isOpen={isOpen} onCancel={mockCancel} onConfirm={mockConfirm} />
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    renderModal(false);
    expect(screen.queryByText(/Name This Device/i)).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    renderModal(true);

    expect(screen.getByText(/Name This Device/i)).toBeInTheDocument();

    expect(screen.getByPlaceholderText(/MacBook Pro/i)).toBeInTheDocument();
  });

  it('updates input value when typing', () => {
    renderModal();

    const input = screen.getByPlaceholderText(/MacBook Pro/i);
    fireEvent.change(input, { target: { value: 'My Laptop' } });

    expect(input).toHaveValue('My Laptop');
  });

  it('disables Continue button when input is empty', () => {
    renderModal();

    const continueBtn = screen.getByRole('button', {
      name: /Continue/i,
    });

    expect(continueBtn).toBeDisabled();
  });

  it('enables Continue button when input has text', () => {
    renderModal();

    const input = screen.getByPlaceholderText(/MacBook Pro/i);
    fireEvent.change(input, { target: { value: 'Device 1' } });

    const continueBtn = screen.getByRole('button', {
      name: /Continue/i,
    });

    expect(continueBtn).not.toBeDisabled();
  });

  it('trims input and calls onConfirm', () => {
    renderModal();

    const input = screen.getByPlaceholderText(/MacBook Pro/i);
    fireEvent.change(input, { target: { value: '  My Device  ' } });

    const continueBtn = screen.getByRole('button', {
      name: /Continue/i,
    });

    fireEvent.click(continueBtn);

    expect(mockConfirm).toHaveBeenCalledWith('My Device');
  });

  it('calls onCancel when Cancel button clicked', () => {
    renderModal();

    const cancelBtn = screen.getByRole('button', {
      name: /Cancel/i,
    });

    fireEvent.click(cancelBtn);

    expect(mockCancel).toHaveBeenCalled();
  });
});
