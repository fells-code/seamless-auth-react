import {
  type RegistrationResponseJSON,
  startRegistration,
} from "@simplewebauthn/browser";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { isPasskeySupported } from "./utils";

interface RegisterPassKeyProps {
  apiHost: string;
  validateToken: () => void;
}

const RegisterPasskey: React.FC<RegisterPassKeyProps> = ({
  apiHost,
  validateToken,
}) => {
  const navigate = useNavigate();
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
        // Pass the options to the authenticator and wait for a response
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

      // Wait for the results of verification
      const verificationJSON = await verificationResp.json();

      if (!verificationResp.ok) {
        console.error("Failed to verify passkey");
        setStatus("error");
        setMessage("Something went wrong registering passkey.");
        return;
      }

      // Show UI appropriate for the `verified` status
      if (verificationJSON && verificationJSON.verified) {
        validateToken();
        navigate("/");
      }
    } catch (error) {
      console.error(`An error occured: ${error}`);
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
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-md text-white w-full max-w-md">
        {passkeyAvailable === null ? (
          <div className="flex items-center justify-center gap-3 p-6 bg-gray-50 rounded-lg shadow">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            <span className="text-gray-600 font-medium">
              Checking for Passkey Support...
            </span>
          </div>
        ) : (
          passkeyAvailable && (
            <div className="p-4 border rounded-lg bg-green-50 text-green-700 shadow">
              <h2 className="text-lg font-semibold mb-2">
                Secure Your Account with a Passkey
              </h2>
              <p className="mb-4">
                Your device supports passkeys! Register one to skip passwords
                forever.
              </p>
              <button
                onClick={handlePasskeyRegister}
                disabled={status === "loading"}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                {status === "loading" ? "Registering..." : "Register Passkey"}
              </button>

              {message && (
                <p
                  className={`mt-4 text-sm ${
                    status === "success" ? "text-green-400" : "text-red-400"
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
