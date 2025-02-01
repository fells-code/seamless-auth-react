import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export interface LoginProps {
  apiHost: string;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ apiHost, error }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [formErrors, setFormErrors] = useState<string>("");

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${apiHost}auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (!response.ok) {
        setFormErrors(
          "Login failed. Try again. If the problem persists, try resetting your password"
        );
        return;
      }

      const result = await response.json();

      localStorage.setItem("authToken", result.token);
      localStorage.setItem("refreshToken", result.refreshToken);
      navigate("/");
    } catch (err) {
      console.error("Unexpected login error", err);
      setFormErrors(
        "An unexpected error occured. Try again. If the problem persists, try resetting your password"
      );
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-1"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-1"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Submit
          </button>
        </form>
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => navigate("/password")}
            className="text-sm text-blue-500 hover:underline"
          >
            Forgot Password?
          </button>
          <button
            onClick={() => navigate("/register")}
            className="text-sm text-blue-500 hover:underline"
          >
            Register
          </button>
        </div>
        <div>{error}</div>
        <div>{formErrors}</div>
      </div>
    </div>
  );
};

export default Login;
