import { startAuthentication } from "@simplewebauthn/browser";
import React from "react";
import { useNavigate } from "react-router-dom";

export interface PassKeyLoginProps {
  apiHost: string;
}

const PassKeyLogin: React.FC<PassKeyLoginProps> = ({ apiHost }) => {
  const navigate = useNavigate();

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
          }),
          credentials: "include",
        }
      );

      if (!verificationResponse.ok) {
        console.error("Failed to verify passkey");
      }

      const verificationResult = await verificationResponse.json();

      if (verificationResult.success) {
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
          Login with Passkey
        </h2>
        <>
          <button
            onClick={handlePasskeyLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition duration-300"
          >
            Use Passkey
          </button>
          <div className="my-4 text-gray-500 text-center">or</div>
        </>
      </div>
    </div>
  );
};

export default PassKeyLogin;
