/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, fireEvent } from '@testing-library/react';
import OtpInput from '@/components/OtpInput';

describe('OtpInput', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders default number of inputs (6)', () => {
    render(<OtpInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  test('renders custom length', () => {
    render(<OtpInput length={4} value="" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(4);
  });

  test('calls onChange when typing a number', () => {
    render(<OtpInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');

    fireEvent.change(inputs[0], { target: { value: '1' } });

    expect(onChange).toHaveBeenCalledWith('1');
  });

  test('rejects non-numeric input', () => {
    render(<OtpInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');

    fireEvent.change(inputs[0], { target: { value: 'a' } });

    expect(onChange).not.toHaveBeenCalled();
  });

  test('moves focus to next input after entering digit', () => {
    render(<OtpInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');

    const focusSpy = jest.spyOn(inputs[1], 'focus');

    fireEvent.change(inputs[0], { target: { value: '1' } });

    expect(focusSpy).toHaveBeenCalled();
  });

  test('moves focus back on backspace when current empty', () => {
    render(<OtpInput value="1" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');

    inputs[1].focus();

    fireEvent.keyDown(inputs[1], { key: 'Backspace' });

    expect(document.activeElement).toBe(inputs[0]);
  });

  test('handles paste of full otp', () => {
    render(<OtpInput value="" onChange={onChange} />);

    const container = screen.getAllByRole('textbox')[0].parentElement!;

    fireEvent.paste(container, {
      clipboardData: {
        getData: () => '123456',
      },
    });

    expect(onChange).toHaveBeenCalledWith('123456');
  });
});
