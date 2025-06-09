import { useAuth } from "AuthProvider";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./styles/login.module.css";
import TermsModal from "./TermsModal";
import { isPasskeySupported, isValidEmail, isValidPhoneNumber } from "./utils";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { apiHost } = useAuth();
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

  const canSubmit = (): boolean | undefined => {
    if (mode === "login" && identifier) {
      return isValidEmail(identifier) || isValidPhoneNumber(identifier);
    }

    return isValidEmail(email) && isValidPhoneNumber(phone);
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
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.heading}>
          {mode === "login" ? "Sign In" : "Create Account"}
        </h2>

        {!passkeyAvailable ? (
          <p className={styles.message}>
            ❌ This device doesn't support passkey login. You must provide or
            register a passkey.
          </p>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              {mode === "login" && (
                <div className={styles.inputGroup}>
                  <label htmlFor="identifier" className={styles.label}>
                    Email Address / Phone Number
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    autoComplete="off"
                    placeholder="Email or Phone Number"
                    className={styles.input}
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
                    required
                  />
                  <p className={styles.helperText}>
                    Phone numbers must include a country code e.g. +1
                  </p>
                  {identifierError && (
                    <p className={styles.error}>{identifierError}</p>
                  )}
                </div>
              )}

              {mode === "register" && (
                <>
                  <div className={styles.inputGroup}>
                    <label htmlFor="email" className={styles.label}>
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      autoComplete="off"
                      className={styles.input}
                      onBlur={() => {
                        if (email) {
                          const isValid = isValidEmail(email);
                          setEmailError(
                            isValid ? "" : "Please enter a valid email"
                          );
                        }
                      }}
                      required
                    />
                    {emailError && <p className={styles.error}>{emailError}</p>}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      autoComplete="off"
                      className={styles.input}
                      onBlur={() => {
                        if (phone) {
                          const isValid = isValidPhoneNumber(phone);
                          setPhoneError(
                            isValid ? "" : "Please enter a valid phone number."
                          );
                        }
                      }}
                    />
                    <p className={styles.helperText}>
                      By signing up, you agree to our{" "}
                      <button
                        onClick={() => setShowModal(true)}
                        className={styles.underline}
                      >
                        SMS Terms & Conditions
                      </button>
                      .
                    </p>
                    {phoneError && <p className={styles.error}>{phoneError}</p>}
                    <TermsModal
                      isOpen={showModal}
                      onClose={() => setShowModal(false)}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className={styles.button}
                disabled={!canSubmit()}
              >
                {mode === "login" ? "Login" : "Register"}
              </button>

              {formErrors && <p className={styles.error}>{formErrors}</p>}

              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className={styles.toggle}
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
