import React, { useRef } from 'react';
import styles from '@/styles/otpInput.module.css';

interface Props {
  length?: number;
  value: string;
  inputMode?: 'numeric' | 'text';
  onChange: (value: string) => void;
}

const OtpInput: React.FC<Props> = ({
  length = 6,
  value,
  inputMode = 'numeric',
  onChange,
}) => {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const values = value.split('').concat(Array(length).fill('')).slice(0, length);

  const handleChange = (index: number, char: string) => {
    if (inputMode === 'numeric') {
      if (!/^\d?$/.test(char)) return;
    }

    if (inputMode === 'text') {
      if (!/[a-z]/i.test(char)) return;
    }

    const newValue = value.substring(0, index) + char + value.substring(index + 1);

    onChange(newValue.trim());

    if (char && inputs.current[index + 1]) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !values[index] && inputs.current[index - 1]) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');

    if (pasted.length === length) {
      onChange(pasted);
      inputs.current[length - 1]?.focus();
    }

    e.preventDefault();
  };

  return (
    <div className={styles.otpContainer} onPaste={handlePaste}>
      {values.map((digit, i) => (
        <input
          key={i}
          ref={el => (inputs.current[i] = el)}
          type="text"
          inputMode={inputMode}
          maxLength={1}
          value={digit || ''}
          className={styles.otpInput}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
};

export default OtpInput;
