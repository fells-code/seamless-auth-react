import { startRegistration } from "@simplewebauthn/browser";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export interface RegisterProps {
  apiHost: string;
}

const RegisterPasskey: React.FC<RegisterProps> = ({ apiHost }) => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async () => {
    setError("");
    setLoading(true);

    try {
      // Step 1: Request registration options from the server
      const optionsRes = await fetch(
        `${apiHost}/webauthn/generate-registration-options`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const options = await optionsRes.json();

      // Step 2: Use browser to generate credentials
      const attResp = await startRegistration(options);

      // Step 3: Send response to server to finalize
      const verifyRes = await fetch(`${apiHost}/webauthn/verify-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, attResp }),
      });

      const { verified, token, refreshToken } = await verifyRes.json();

      if (verified) {
        localStorage.setItem("authToken", token);
        localStorage.setItem("refreshToken", refreshToken);
        navigate("/");
      } else {
        setError("Registration failed. Try again.");
      }
    } catch (err: unknown) {
      console.error(err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Sign Up with Passkey
        </h2>
        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="phone">
              Phone (optional)
            </label>
            <input
              id="phone"
              type="tel"
              pattern="^\+?[1-9]\d{1,14}$"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1234567890"
            />
          </div>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition duration-300"
          >
            {loading ? "Registering..." : "Register with Passkey"}
          </button>
          <p
            className="text-sm text-blue-400 hover:underline text-center mt-2 cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Already have an account? Login
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPasskey;
