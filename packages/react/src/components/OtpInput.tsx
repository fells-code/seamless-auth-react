/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import React, { useRef } from 'react';
import styles from '@/styles/otpInput.module.css';

interface Props {
  length?: number;
  value: string;
  inputMode?: 'numeric' | 'text';
  onChange: (value: string) => void;
  name?: string;
}

const OtpInput: React.FC<Props> = ({
  length = 6,
  value,
  inputMode = 'numeric',
  onChange,
  name = 'otp',
}) => {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const values = value.split('').concat(Array(length).fill('')).slice(0, length);

  const isValidChar = (char: string) => {
    if (inputMode === 'numeric') return /^\d$/.test(char);
    return /^[a-zA-Z]$/.test(char);
  };

  const handleChange = (index: number, input: string) => {
    if (input.length > 1) {
      handleBulkInput(index, input);
      return;
    }

    if (!input || isValidChar(input)) {
      const newValueArr = [...values];
      newValueArr[index] = input;

      const newValue = newValueArr.join('');
      onChange(newValue);

      if (input && inputs.current[index + 1]) {
        inputs.current[index + 1]?.focus();
      }
    }
  };

  const handleBulkInput = (index: number, input: string) => {
    let cleaned = input;

    if (inputMode === 'numeric') {
      cleaned = input.replace(/\D/g, '');
    } else {
      cleaned = input.replace(/[^a-zA-Z]/g, '');
    }

    const chars = cleaned.slice(0, length).split('');

    const newValueArr = [...values];

    chars.forEach((char, i) => {
      if (index + i < length) {
        newValueArr[index + i] = char;
      }
    });

    onChange(newValueArr.join(''));
    inputs.current[Math.min(index + chars.length, length - 1)]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault();

      const newValueArr = [...values];

      if (values[index]) {
        newValueArr[index] = '';
        onChange(newValueArr.join(''));
      } else if (index > 0) {
        newValueArr[index - 1] = '';
        onChange(newValueArr.join(''));
        inputs.current[index - 1]?.focus();
      }
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowRight' && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    handleBulkInput(0, e.clipboardData.getData('text'));
  };

  return (
    <div
      className={styles.otpContainer}
      role="group"
      aria-label="One-time password input"
      onPaste={handlePaste}
    >
      {values.map((char, i) => (
        <input
          key={i}
          ref={el => (inputs.current[i] = el)}
          type="text"
          inputMode={inputMode === 'numeric' ? 'numeric' : 'text'}
          autoComplete="one-time-code"
          name={`${name}-${i}`}
          maxLength={1}
          value={char}
          className={styles.otpInput}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
};

export default OtpInput;
