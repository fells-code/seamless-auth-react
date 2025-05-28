import React, { useEffect, useRef } from "react";

import styles from "./styles/termsModal.module.css";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
    >
      <div className={styles.modal} tabIndex={-1} ref={modalRef}>
        <div className={styles.header}>
          <h2 id="terms-title" className={styles.title}>
            SMS Terms & Conditions
          </h2>
          <button onClick={onClose} className={styles.closeBtn}>
            &times;
          </button>
        </div>
        <div className={styles.content}>
          <p>
            <strong>Effective Date:</strong> June 01, 2025
          </p>
          <p>
            By providing your phone number to SeamlessAuth, a Fells Code LLC
            product, you agree to receive SMS messages for identity
            verification, authentication, and account security.
          </p>
          <p>
            <strong>1. Purpose:</strong> SMS is used only for account security
            (OTP, MFA). No marketing messages.
          </p>
          <p>
            <strong>2. Frequency:</strong> Based on login and account activity.
          </p>
          <p>
            <strong>3. Opt-Out:</strong> Contact support@seamlessauth.com to opt
            out.
          </p>
          <p>
            <strong>4. Fees:</strong> Standard carrier rates may apply.
          </p>
          <p>
            <strong>5. Supported Carriers:</strong> Most major providers
            supported, delivery not guaranteed.
          </p>
          <p>
            <strong>6. Privacy:</strong> Your phone number is not shared or
            sold. See our Privacy Policy.
          </p>
          <p>
            <strong>7. Changes:</strong> Terms may be updated with notice on
            this page.
          </p>
          <p>
            Questions? Email us at{" "}
            <a className={styles.link} href="mailto:support@seamlessauth.com">
              support@seamlessauth.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
