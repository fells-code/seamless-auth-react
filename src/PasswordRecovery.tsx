import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export interface PasswordRecoveryProps {
  apiHost: string;
}

const PasswordRecovery: React.FC<PasswordRecoveryProps> = ({ apiHost }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const recoverPassword = async (email: string) => {
    try {
      const response = await fetch(`${apiHost}auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.status === 404) {
        setError(
          "If this email is associated with an account, an email will be sent."
        );
      }

      if (!response.ok) {
        setError(
          "If this email is associated with an account, an email will be sent."
        );
      }
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      setError(
        "If this email is associated with an account, an email will be sent."
      );
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    recoverPassword(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Recover Password
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="email" className="block text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-300 rounded mt-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={!email}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition duration-300 disabled:bg-gray-400 cursor-not-allowed p-2 rounded"
          >
            Send Recovery Email
          </button>
        </form>
        <button
          onClick={() => navigate("/login")}
          className="w-full mt-4 text-blue-400 hover:underline"
        >
          Back to Login
        </button>
        <div className="mt-4">{error}</div>
      </div>
    </div>
  );
};

export default PasswordRecovery;
