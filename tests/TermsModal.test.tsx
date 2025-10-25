import { render, screen, fireEvent } from '@testing-library/react';
import TermsModal from '../src/TermsModal';

describe('TermsModal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(<TermsModal isOpen={false} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when open', () => {
    render(<TermsModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/SMS Terms & Conditions/i)).toBeInTheDocument();
    expect(screen.getByText(/Effective Date/i)).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(<TermsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /×/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    render(<TermsModal isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for other keys', () => {
    const onClose = jest.fn();
    render(<TermsModal isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Enter', code: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('focuses modal when opened', () => {
    render(<TermsModal isOpen={true} onClose={jest.fn()} />);
    const modal = screen.getByRole('dialog').querySelector('[tabindex="-1"]');
    expect(modal).toHaveAttribute('tabindex', '-1');
  });
});
