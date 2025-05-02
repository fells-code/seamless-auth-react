import { startAuthentication } from "@simplewebauthn/browser";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import TermsModal from "./TermsModal";
import { isPasskeySupported, validateEmail, validatePhone } from "./utils";

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
  const [submitted, setSubmitted] = useState<boolean>(false);
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

  const login = async (email: string) => {
    setFormErrors("");

    try {
      const response = await fetch(`${apiHost}auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
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

      if (data.message === "success") {
        navigate("/verifyOTP");
      }
      // TODO what happens if data.message isn't false!?
    } catch (err) {
      console.error("Unexpected login error", err);
      setFormErrors(
        "An unexpected error occured. Try again. If the problem persists, try resetting your password"
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === "login") login(email);
    if (mode === "register") register();
  };

  const handlePasskeyLogin = async () => {
    try {
      const response = await fetch(
        `${apiHost}webAuthn/generate-authentication-options`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "bccorb1000@gmail.com",
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        console.error("Something went wrong getting options");
        return;
      }

      const options = await response.json();
      const credential = await startAuthentication(options);

      const verificationResponse = await fetch(
        `${apiHost}webAuthn/verify-authentication`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assertionResponse: credential,
            email: "bccorb1000@gmail.com",
          }),
          credentials: "include",
        }
      );

      if (!verificationResponse.ok) {
        console.error("Failed to verify passkey");
      }

      const verificationResult = await verificationResponse.json();

      if (verificationResult.success) {
        localStorage.setItem("authToken", verificationResult.accessToken);
        localStorage.setItem("refreshToken", verificationResult.refreshToken);
        navigate("/");
      } else {
        console.error("Passkey login failed:", verificationResult.message);
        alert("Login failed, please try again.");
      }
    } catch (error) {
      console.error("Passkey login error:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {mode === "login" ? "Sign In" : "Create Account"}
        </h2>

        {mode === "login" && passkeyAvailable ? (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center">
              Login with Passkey
            </h1>
            <button
              onClick={handlePasskeyLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition duration-300"
            >
              Use Passkey
            </button>
            <div className="my-4 text-gray-500 text-center">or</div>
          </>
        ) : null}

        {submitted ? (
          <p className="text-green-400 text-center">
            ✅ If your email or phone is registered, you’ll receive a
            verification code shortly.
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
                    onBlur={() => {
                      if (identifier) {
                        const isValid =
                          validateEmail(identifier) ||
                          validatePhone(identifier);
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
                          const isValid = validateEmail(email);
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
                          const isValid = validatePhone(phone);
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
                  !email ||
                  !validateEmail(email) ||
                  !phone ||
                  !validatePhone(phone)
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
