import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import LoadingSpinner from "./LoadingSpinner";

export interface ResetPasswordProps {
  apiHost: string;
  setLoading(value: boolean): void;
  validateToken(): void;
}

const VerifyAccount: React.FC<ResetPasswordProps> = ({
  apiHost,
  validateToken,
}) => {
  const navigate = useNavigate();
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

  const verify = async (verificationToken: string | null) => {
    try {
      const response = await fetch(`${apiHost}auth/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verificationToken }),
      });

      if (!response.ok) {
        navigate("/login", {
          state: {
            error:
              "An error occured validating your token. Try resetting your password.",
          },
        });
        return;
      }

      const result = await response.json();

      localStorage.setItem("authToken", result.token);
      localStorage.setItem("refreshToken", result.refreshToken);
      validateToken();
      navigate("/");
    } catch {
      navigate("/login", {
        state: {
          error:
            "An unexpected error occured validating your token. Try resetting your password.",
        },
      });
    }
  };

  useEffect(() => {
    const token = urlParams.get("token");

    if (token) {
      verify(token);
    } else {
      navigate("/login", {
        state: {
          error:
            "Token is invalid or missing for verifcation. Check your verfication email and try again or reset your password if the issue persists.",
        },
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <LoadingSpinner />
    </div>
  );
};

export default VerifyAccount;
