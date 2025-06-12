import { startAuthentication } from "@simplewebauthn/browser";
import { useAuth } from "AuthProvider";
import { useInternalAuth } from "context/InternalAuthContext";
import React from "react";
import { useNavigate } from "react-router-dom";

import styles from "./styles/passKeyLogin.module.css";

const PassKeyLogin: React.FC = () => {
  const navigate = useNavigate();
  const { apiHost } = useAuth();
  const { validateToken } = useInternalAuth();

  const handlePasskeyLogin = async () => {
    try {
      const response = await fetch(
        `${apiHost}webAuthn/generate-authentication-options`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (!response.ok) {
        console.error("Something went wrong getting webauthn options");
        return;
      }

      const options = await response.json();
      const credential = await startAuthentication({ optionsJSON: options });

      const verificationResponse = await fetch(
        `${apiHost}webAuthn/verify-authentication`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assertionResponse: credential }),
          credentials: "include",
        }
      );

      if (!verificationResponse.ok) {
        console.error("Failed to verify passkey");
      }

      const verificationResult = await verificationResponse.json();

      if (verificationResult.message === "Success") {
        if (verificationResult.token) {
          await validateToken();
          navigate("/");
          return;
        }
        navigate("/mfaLogin");
      } else {
        console.error("Passkey login failed:", verificationResult.message);
      }
    } catch (error) {
      console.error("Passkey login error:", error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Login with Passkey</h2>
        <button onClick={handlePasskeyLogin} className={styles.button}>
          Use Passkey
        </button>
      </div>
    </div>
  );
};

export default PassKeyLogin;
