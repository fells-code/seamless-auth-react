import React, { useState } from "react";

export interface LoginProps {
  apiHost: string;
  setLoading: (bool: boolean) => void;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ apiHost }) => {
  const [email, setEmail] = useState<string>("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<string>("");
  const [phoneError, setPhoneError] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const isValid = /^\+?[1-9]\d{1,14}$/.test(value);
    setPhone(value.replace(/[^\d+]/g, ""));
    setPhoneError(isValid ? "" : "Please enter a valid phone number.");
  };

  const login = async (email: string) => {
    setFormErrors("");

    try {
      const response = await fetch(`${apiHost}auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        setFormErrors("Failed to send login link. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Unexpected login error", err);
      setFormErrors(
        "An unexpected error occured. Try again. If the problem persists, try resetting your password"
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    login(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {mode === "login" ? "Sign In" : "Create Account"}
        </h2>

        {submitted ? (
          <p className="text-green-400 text-center">
            ✅ If your email is registered, you’ll receive a verification code
            shortly.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-300">
                Email Address
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

            {mode === "register" && (
              <div className="mb-4">
                <label className="block text-gray-300">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full p-2 bg-gray-700 border border-gray-300 rounded mt-1 text-white"
                />
                {phoneError && (
                  <p className="text-red-400 text-sm">{phoneError}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition duration-300 disabled:bg-gray-400 cursor-not-allowed p-2 rounded`}
              disabled={!email}
            >
              {mode === "login" ? "Login" : "Register"}
            </button>

            {formErrors && (
              <p className="text-red-400 mt-4 text-center">{formErrors}</p>
            )}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="mt-6 w-full text-sm text-blue-400 hover:underline"
            >
              {mode === "login"
                ? "Don't have an account? Create one"
                : "Already have an account? Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
