import React from "react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 p-6 rounded-lg max-w-2xl w-full shadow-xl overflow-y-auto max-h-[80vh] text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-blue-400">
            SMS Terms & Conditions
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>
        <div className="space-y-4 text-gray-300 text-sm">
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
            <a
              className="text-blue-400 underline"
              href="mailto:support@seamlessauth.com"
            >
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
