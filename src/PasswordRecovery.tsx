import React, { useState } from "react";

interface PasswordRecoveryProps {
  onRecover: (email: string) => void;
  onBackToLogin: () => void;
}

const PasswordRecovery: React.FC<PasswordRecoveryProps> = ({
  onRecover,
  onBackToLogin,
}) => {
  const [email, setEmail] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRecover(email);
  };

  return (
    <div>
      <h2>Recover Password</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit">Submit</button>
        <button type="button" onClick={onBackToLogin}>
          Back to Login
        </button>
      </form>
    </div>
  );
};

export default PasswordRecovery;
