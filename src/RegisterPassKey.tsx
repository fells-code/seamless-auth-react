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

  function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
    const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer.buffer;
  }

  function decodeSimpleWebauthnOptions(options: any) {
    return {
      ...options,
      challenge: base64urlToArrayBuffer(options.challenge),
      user: {
        ...options.user,
        id: base64urlToArrayBuffer(options.user.id),
      },
      excludeCredentials: (options.excludeCredentials || []).map(
        (cred: any) => ({
          ...cred,
          id: base64urlToArrayBuffer(cred.id),
        })
      ),
    };
  }

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

      const options = await challengeRes.json();

      const publicKey = decodeSimpleWebauthnOptions(options);

      let attResp: RegistrationResponseJSON;
      try {
        attResp = await startRegistration({ optionsJSON: publicKey });

        await verifyPassKey(attResp);
      } catch (error) {
        console.error("A problem happened.");
        setStatus("error");
        setMessage(`Error: ${error}`);
        throw error;
      }

      setStatus("success");
      setMessage("Passkey registered successfully.");
      navigate("/");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Something went wrong registering passkey.");
    }
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
        await validateToken();
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
