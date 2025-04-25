import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const VerifyOTP: React.FC = () => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const type = location.state?.type || "email"; // "email" or "phone"
  const destination = location.state?.destination || ""; // user’s email/phone

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, type }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verification failed.");
      } else {
        navigate("/dashboard");
      }
    } catch {
      setError("Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-4">
          Enter your 6-digit code
        </h2>
        <p className="text-gray-400 text-center mb-6">
          We sent a code to your {type}:{" "}
          <span className="font-medium">{destination}</span>
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full text-center p-3 text-lg rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            placeholder="Enter code"
          />
          {error && <p className="text-red-400 text-center mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition-colors duration-300 py-2 rounded font-medium"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
        <p className="text-sm text-center text-gray-500 mt-4">
          Didn’t get the code?{" "}
          <button className="text-blue-400 hover:underline">Resend</button>
        </p>
      </div>
    </div>
  );
};

export default VerifyOTP;
