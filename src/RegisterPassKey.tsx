import {
  type RegistrationResponseJSON,
  startRegistration,
} from "@simplewebauthn/browser";
import { useAuth } from "AuthProvider";
import { useInternalAuth } from "context/InternalAuthContext";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./styles/registerPasskey.module.css";
import { isPasskeySupported } from "./utils";

const RegisterPasskey: React.FC = () => {
  const navigate = useNavigate();
  const { apiHost } = useAuth();
  const { validateToken } = useInternalAuth();
  const [status, setStatus] = useState<
    "idle" | "success" | "error" | "loading"
  >("idle");
  const [message, setMessage] = useState("");
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);

  const handlePasskeyRegister = async () => {
    setStatus("loading");

    try {
      const challengeRes = await fetch(
        `${apiHost}webAuthn/generate-registration-options`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!challengeRes.ok) {
        setStatus("error");
        setMessage("Something went wrong registering passkey.");
        return;
      }

      const optionsJSON = await challengeRes.json();

      let attResp: RegistrationResponseJSON;
      try {
        attResp = await startRegistration({
          optionsJSON,
          useAutoRegister: true,
        });

        await verifyPassKey(attResp);
      } catch (error) {
        console.error("A problem happened.");
        throw error;
      }

      setStatus("success");
      setMessage("Passkey registered successfully.");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Something went wrong registering passkey.");
    }

    navigate("/");
  };

  const verifyPassKey = async (attResp: RegistrationResponseJSON) => {
    try {
      const verificationResp = await fetch(
        `${apiHost}webAuthn/verify-registration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attestationResponse: attResp,
          }),
          credentials: "include",
        }
      );

      const verificationJSON = await verificationResp.json();

      if (!verificationResp.ok) {
        setStatus("error");
        setMessage("Something went wrong registering passkey.");
        return;
      }

      if (verificationJSON?.verified) {
        validateToken();
        navigate("/");
      }
    } catch (error) {
      console.error(`An error occurred: ${error}`);
    }
  };

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

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {passkeyAvailable === null ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <span>Checking for Passkey Support...</span>
          </div>
        ) : (
          passkeyAvailable && (
            <div className={styles.supported}>
              <h2 className={styles.title}>
                Secure Your Account with a Passkey
              </h2>
              <p className={styles.description}>
                Your device supports passkeys! Register one to skip passwords
                forever.
              </p>
              <button
                onClick={handlePasskeyRegister}
                disabled={status === "loading"}
                className={styles.button}
              >
                {status === "loading" ? "Registering..." : "Register Passkey"}
              </button>
              {message && (
                <p
                  className={`${styles.message} ${
                    status === "success" ? styles.success : styles.error
                  }`}
                >
                  {message}
                </p>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default RegisterPasskey;
