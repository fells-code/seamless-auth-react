import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export interface PasswordRecoveryProps {
  apiHost: string;
}

const PasswordRecovery: React.FC<PasswordRecoveryProps> = ({ apiHost }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const recoverPassword = async (email: string) => {
    try {
      await fetch(`${apiHost}auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      alert("Password reset email sent.");
    } catch (error) {
      console.error("Failed to send password reset email:", error);
    }
    navigate("/login");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    recoverPassword(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Recover Password
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="email" className="block text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-1"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Send Recovery Email
          </button>
        </form>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 text-blue-500 hover:underline w-full text-center"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default PasswordRecovery;
