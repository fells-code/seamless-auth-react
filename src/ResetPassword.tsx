import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export interface ResetPasswordProps {
  apiHost: string;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ apiHost }) => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [disabled, setDisabled] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

  const resetPassword = async (password: string) => {
    if (urlParams.get("token")) {
      const token = urlParams.get("token");

      try {
        const response = await fetch(`${apiHost}auth/reset-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, password }),
        });

        if (!response.ok) {
          setError("Password reset failed.");
        }
        alert("Password has been reset.");
        navigate("/login");
      } catch (error) {
        console.error("Failed to reset password:", error);
        navigate("/login", {
          state: {
            error:
              "An unexpected error occured resetting your password. Try resetting your password again.",
          },
        });
      }
    } else {
      navigate("/login", {
        state: {
          error:
            "Token is invalid or missing for verifcation. Check your reset password email and try again or reset your password again if the issue persists.",
        },
      });
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    resetPassword(newPassword);
  };

  useEffect(() => {
    if (newPassword && confirmPassword && newPassword === confirmPassword) {
      setDisabled(false);
    }
  }, [newPassword, confirmPassword]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Set New Password
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-1"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700">
              Confirm Password
            </label>
            <input
              id="password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-1"
              required
            />
          </div>
          <button
            disabled={disabled}
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Submit
          </button>
          <div>{error}</div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
