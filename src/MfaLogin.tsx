import React, { useEffect, useState } from "react";

export interface MfaLoginProps {
  apiHost: string;
  maskedPhone?: string;
  maskedEmail?: string;
  validateToken: () => void;
}

const MfaLogin: React.FC<MfaLoginProps> = ({
  apiHost,
  maskedPhone = "****1234",
  maskedEmail = "j***@example.com",
  validateToken,
}) => {
  const [OTP, setOTP] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(300);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setLoading(true);
    try {
      verifyOTP();
    } catch {
      setError("Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const endpoint =
      selectedMethod === "phone"
        ? "otp/verify-login-phone-otp"
        : "otp/verify-login-email-otp";
    try {
      const response = await fetch(`${apiHost}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verificationToken: OTP,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        setError("Verification failed.");
        return;
      }
    } catch (error: unknown) {
      console.error(error);
      setError("Verification failed.");
    }

    validateToken();
  };

  const sendOTP = async (target: string) => {
    setError("");

    const endpoint =
      target === "phone"
        ? "otp/generate-login-phone-otp"
        : "otp/generate-login-email-otp";

    const response = await fetch(`${apiHost}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      setError(
        `Failed to send ${target} code. If this persists, refresh the page and try again.`
      );
      return;
    } else {
      setResendMsg(
        `Verification ${target === "phone" ? "SMS" : "email"} has been sent.`
      );
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-lg p-6 w-full max-w-md space-y-6">
        <h2 className="text-2xl font-semibold text-center">
          Multi-factor Authentication
        </h2>

        {resendMsg && (
          <p className="text-green-400 text-center mb-3">{resendMsg}</p>
        )}

        <div className="space-y-4">
          <button
            onClick={() => {
              setSelectedMethod("phone");
              sendOTP("phone");
            }}
            className={`w-full py-3 px-4 rounded-lg border transition-colors duration-200 ${
              selectedMethod === "phone"
                ? "bg-blue-600 border-blue-500"
                : "bg-gray-700 border-gray-600 hover:bg-gray-600"
            }`}
          >
            Send code to phone:{" "}
            <span className="font-mono ml-2">{maskedPhone}</span>
          </button>

          <button
            onClick={() => {
              setSelectedMethod("email");
              sendOTP("email");
            }}
            className={`w-full py-3 px-4 rounded-lg border transition-colors duration-200 ${
              selectedMethod === "email"
                ? "bg-blue-600 border-blue-500"
                : "bg-gray-700 border-gray-600 hover:bg-gray-600"
            }`}
          >
            Send code to email:{" "}
            <span className="font-mono ml-2">{maskedEmail}</span>
          </button>
        </div>

        {selectedMethod && (
          <>
            <div className="mt-6 space-y-2">
              {error && (
                <p className="text-red-400 text-center mb-4">{error}</p>
              )}
              <label htmlFor="otp" className="block text-sm font-medium">
                Enter the 6-digit code sent to your {selectedMethod}. <br />
                <span className="text-sm text-yellow-400">
                  Code expires in: {formatTime(timeLeft)}
                </span>
              </label>
              <input
                id="otp"
                type="text"
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg tracking-widest"
                placeholder="••••••"
                onChange={(e) => {
                  setOTP(e.target.value);
                }}
              />
            </div>
            <button
              onClick={handleSubmit}
              className={
                "w-full py-3 px-4 rounded-lg border transition-colors duration-200 bg-blue-600 border-blue-500 disabled:bg-gray-400 cursor-not-allowed p-2 rounded"
              }
              disabled={!OTP || OTP.length < 6}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MfaLogin;
