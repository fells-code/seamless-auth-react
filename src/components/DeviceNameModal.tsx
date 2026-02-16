import React, { useState } from 'react';
import styles from '@/styles/deviceNameModal.module.css';

interface DeviceNameModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}

const DeviceNameModal: React.FC<DeviceNameModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
}) => {
  const [value, setValue] = useState('');

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3>Name This Device</h3>
        <p className={styles.description}>
          Give this passkey a friendly name so you can recognize it later.
        </p>

        <input
          type="text"
          placeholder="e.g., MacBook Pro, iPhone, YubiKey"
          value={value}
          onChange={e => setValue(e.target.value)}
          className={styles.input}
          autoFocus
        />

        <div className={styles.actions}>
          <button onClick={onCancel} className={styles.secondary}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(value.trim())}
            disabled={!value.trim()}
            className={styles.primary}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceNameModal;
