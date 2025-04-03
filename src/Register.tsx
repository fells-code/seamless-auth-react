import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export interface RegisterProps {
  apiHost: string;
}

const Register: React.FC<RegisterProps> = ({ apiHost }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const register = async (email: string, password: string) => {
    try {
      const response = await fetch(`${apiHost}auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (response.status === 409) {
        setMessage("Email already in use.");
        return;
      }

      if (!response.ok) {
        setMessage("Registeration failure occured.");
        return;
      }

      setMessage(`Verfication email sent to ${email}`);
    } catch {
      setMessage(
        "An unexpected error occured while attempting to register. Try again."
      );
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    register(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
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
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-300 rounded mt-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-gray-300">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-300 rounded mt-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={!email || !password || !confirmPassword}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition duration-300 disabled:bg-gray-400 cursor-not-allowed p-2 rounded"
          >
            Signup
          </button>
          <div>{message}</div>
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

export default Register;
