import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import TermsModal from "./TermsModal";
import { isPasskeySupported, isValidEmail, isValidPhoneNumber } from "./utils";

export interface LoginProps {
  apiHost: string;
  setLoading: (bool: boolean) => void;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ apiHost }) => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState<string>("");
  const [formErrors, setFormErrors] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [identifierError, setIdentifierError] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);

  useEffect(() => {
    /**
     *
     */
    async function checkSupport() {
      const supported = await isPasskeySupported();
      setPasskeyAvailable(supported);
    }

    checkSupport();
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phoneNumber = e.target.value;
    setPhone(phoneNumber.replace(/[^\d+]/g, ""));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setEmail(email);
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIdentifier(value);
  };

  const login = async () => {
    setFormErrors("");

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
      console.error("Unexpected login error", err);
      setFormErrors(
        "An unexpected error occured. Try again. If the problem persists, try resetting your password"
      );
    }
  };

  const register = async () => {
    setFormErrors("");

    try {
      const response = await fetch(`${apiHost}registration/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
        credentials: "include",
      });

      if (!response.ok) {
        setFormErrors("Failed to register. Please try again.");
        return;
      }

      const data = await response.json();

      if (data.message === "Success") {
        navigate("/verifyOTP");
      }
      setFormErrors(
        "An unexpected error occured. Try again. If the problem persists, try resetting your password"
      );
    } catch (err) {
      console.error("Unexpected login error", err);
      setFormErrors(
        "An unexpected error occured. Try again. If the problem persists, try resetting your password"
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === "login") login();
    if (mode === "register") register();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {mode === "login" ? "Sign In" : "Create Account"}
        </h2>

        {!passkeyAvailable ? (
          <p className="text-green-400 text-center">
            ❌ This device doesn't seem to have access to a passwordless
            authenticator You won't be able to login without providing a passkey
            or registering a passkey.
          </p>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              {mode === "login" && (
                <div className="mb-4">
                  <label htmlFor="identifer" className="block text-gray-300">
                    Email Address / Phone Number
                  </label>
                  <input
                    id="identifer"
                    type="text"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    autoComplete="off"
                    placeholder="Email or Phone Number"
                    onBlur={() => {
                      if (identifier) {
                        const isValid =
                          isValidEmail(identifier) ||
                          isValidPhoneNumber(identifier);
                        setIdentifierError(
                          isValid
                            ? ""
                            : "Please enter a valid email or phone number"
                        );
                      }
                    }}
                    className="w-full p-2 bg-gray-700 border border-gray-300 rounded mt-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Phone numbers must include a country code e.g. +1
                  </p>
                  {identifierError && (
                    <p className="text-red-400 text-sm">{identifierError}</p>
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
                      onChange={handleEmailChange}
                      autoComplete="off"
                      onBlur={() => {
                        if (email) {
                          const isValid = isValidEmail(email);
                          setEmailError(
                            isValid ? "" : "Please enter a valid email"
                          );
                        }
                      }}
                      className="w-full p-2 bg-gray-700 border border-gray-300 rounded mt-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    {emailError && (
                      <p className="text-red-400 text-sm">{emailError}</p>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-300">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      autoComplete="off"
                      onBlur={() => {
                        if (phone) {
                          const isValid = isValidPhoneNumber(phone);
                          setPhoneError(
                            isValid ? "" : "Please enter a valid phone number."
                          );
                        }
                      }}
                      className="w-full p-2 bg-gray-700 border border-gray-300 rounded mt-1 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-4">
                      By signing up, you agree to our{" "}
                      <button
                        onClick={() => setShowModal(true)}
                        className="text-blue-400 underline"
                      >
                        SMS Terms & Conditions
                      </button>
                      .
                    </p>

                    <TermsModal
                      isOpen={showModal}
                      onClose={() => setShowModal(false)}
                    />
                    {phoneError && (
                      <p className="text-red-400 text-sm">{phoneError}</p>
                    )}
                  </div>
                </>
              )}

              <button
                type="submit"
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition duration-300 disabled:bg-gray-400 cursor-not-allowed p-2 rounded`}
                disabled={
                  !identifier ||
                  (!isValidEmail(identifier) && !isValidPhoneNumber(identifier))
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
                  ? "Don't have an account? Create one"
                  : "Already have an account? Sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
