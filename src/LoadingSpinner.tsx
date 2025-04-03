import React from "react";

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div
        data-testid="loading"
        className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"
      ></div>
    </div>
  );
};

export default LoadingSpinner;
