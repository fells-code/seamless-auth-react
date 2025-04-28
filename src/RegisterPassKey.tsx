import {
  type RegistrationResponseJSON,
  startRegistration,
} from "@simplewebauthn/browser";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface RegisterPassKeyProps {
  apiHost: string;
  validateToken: () => void;
}

const RegisterPasskey: React.FC<RegisterPassKeyProps> = ({
  apiHost,
  validateToken,
}) => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    "idle" | "success" | "error" | "loading"
  >("idle");
  const [message, setMessage] = useState("");

  const handlePasskeyRegister = async () => {
    setStatus("loading");

    if (!token) {
      console.error("Missing verification token");
      navigate("/login");
    }

    try {
      const challengeRes = await fetch(
        `${apiHost}webauthn/generate-registration-options`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const optionsJSON = await challengeRes.json();

      let attResp: RegistrationResponseJSON;
      try {
        // Pass the options to the authenticator and wait for a response
        attResp = await startRegistration({
          optionsJSON,
          useAutoRegister: true,
        });

        verifyPassKey(attResp);
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
  };

  const verifyPassKey = async (attResp: RegistrationResponseJSON) => {
    const verificationResp = await fetch(
      `${apiHost}webauthn/verify-registration`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attestationResponse: attResp,
        }),
      }
    );

    // Wait for the results of verification
    const verificationJSON = await verificationResp.json();

    // Show UI appropriate for the `verified` status
    if (verificationJSON && verificationJSON.verified) {
      console.log("Registered");
      localStorage.setItem("authToken", verificationJSON.accessToken);
      localStorage.setItem("refreshToken", verificationJSON.refreshToken);
      validateToken();
    } else {
      throw new Error("Failed to save passkey");
    }
  };

  useEffect(() => {
    if (!token) {
      console.error("Missing Token.");
      navigate("/");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-md text-white w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          Secure your account with a Passkey
        </h2>

        <button
          onClick={handlePasskeyRegister}
          disabled={status === "loading"}
          className="bg-blue-600 hover:bg-blue-700 w-full py-2 px-4 rounded transition duration-300 disabled:opacity-50"
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
    </div>
  );
};

export default RegisterPasskey;
