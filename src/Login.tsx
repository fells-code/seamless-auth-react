import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import TermsModal from "./TermsModal";
import { isPasskeySupported, isValidEmail, isValidPhoneNumber } from "./utils";

export interface LoginProps {
  apiHost: string;
  setLoading?: (bool: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ apiHost, setLoading }) => {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [formErrors, setFormErrors] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [identifierError, setIdentifierError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);

  useEffect(() => {
    isPasskeySupported().then(setPasskeyAvailable);
  }, []);

  const handleLogin = async () => {
    setFormErrors("");
    setLoading?.(true);

    try {
      const response = await fetch(`${apiHost}auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, passkeyAvailable }),
        credentials: "include",
      });

      if (!response.ok) {
        setFormErrors("Failed to send login link. Please try again.");
        return;
      }

      navigate("/passKeyLogin");
    } catch (err) {
      console.error("Login error", err);
      setFormErrors("Unexpected error. Please try again.");
    } finally {
      setLoading?.(false);
    }
  };

  const handleRegister = async () => {
    setFormErrors("");
    setLoading?.(true);

    try {
      const response = await fetch(`${apiHost}registration/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
        credentials: "include",
      });

      if (!response.ok) {
        setFormErrors("Registration failed. Please try again.");
        return;
      }

      const data = await response.json();
      if (data.message === "Success") {
        navigate("/verifyOTP");
      } else {
        setFormErrors("Unexpected error. Please try again.");
      }
    } catch (err) {
      console.error("Register error", err);
      setFormErrors("Unexpected error. Please try again.");
    } finally {
      setLoading?.(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode === "login") await handleLogin();
    else await handleRegister();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {mode === "login" ? "Sign In" : "Create Account"}
        </h2>

        {!passkeyAvailable ? (
          <p className="text-red-400 text-center mb-4">
            ❌ This device doesn't support passkeys.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            {mode === "login" && (
              <div className="mb-4">
                <label htmlFor="identifier" className="block text-gray-300">
                  Email / Phone
                </label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onBlur={() => {
                    const isValid =
                      isValidEmail(identifier) ||
                      isValidPhoneNumber(identifier);
                    setIdentifierError(
                      isValid ? "" : "Enter a valid email or phone number"
                    );
                  }}
                  placeholder="Email or Phone Number"
                  className="w-full p-2 bg-gray-700 border border-gray-300 rounded mt-1"
                  required
                />
                {identifierError && (
                  <p className="text-red-400 text-sm mt-1">{identifierError}</p>
                )}
              </div>
            )}

            {mode === "register" && (
              <>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-gray-300">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() =>
                      setEmailError(
                        isValidEmail(email) ? "" : "Please enter a valid email"
                      )
                    }
                    className="w-full p-2 bg-gray-700 border border-gray-300 rounded mt-1"
                    required
                  />
                  {emailError && (
                    <p className="text-red-400 text-sm mt-1">{emailError}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="phone" className="block text-gray-300">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/[^\d+]/g, ""))
                    }
                    onBlur={() =>
                      setPhoneError(
                        isValidPhoneNumber(phone)
                          ? ""
                          : "Enter a valid phone number"
                      )
                    }
                    className="w-full p-2 bg-gray-700 border border-gray-300 rounded mt-1"
                    required
                  />
                  {phoneError && (
                    <p className="text-red-400 text-sm mt-1">{phoneError}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-3">
                    By signing up, you agree to our{" "}
                    <button
                      type="button"
                      onClick={() => setShowModal(true)}
                      className="text-blue-400 underline"
                    >
                      SMS Terms
                    </button>
                    .
                  </p>
                  <TermsModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded mt-2 disabled:bg-gray-500"
              disabled={
                (mode === "login" &&
                  (!identifier ||
                    (!isValidEmail(identifier) &&
                      !isValidPhoneNumber(identifier)))) ||
                (mode === "register" &&
                  (!email ||
                    !phone ||
                    !isValidEmail(email) ||
                    !isValidPhoneNumber(phone)))
              }
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
                ? "Don't have an account? Register"
                : "Already have an account? Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
