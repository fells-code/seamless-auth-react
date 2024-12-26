import React, { useState } from "react";

export interface LoginProps {
  onLogin: (username: string, password: string) => void;
  onForgotPassword: () => void;
  onRegister: () => void;
  error: string;
}

const Login: React.FC<LoginProps> = ({
  onLogin,
  onForgotPassword,
  onRegister,
}) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin(email, password);
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
            onClick={onForgotPassword}
            className="text-sm text-blue-500 hover:underline"
          >
            Forgot Password?
          </button>
          <button
            onClick={onRegister}
            className="text-sm text-blue-500 hover:underline"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
