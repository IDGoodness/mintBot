import React from 'react';
import { useLocation } from 'react-router-dom';

const SuccessPage: React.FC = () => {
  const location = useLocation();
  const { status } = location.state || { status: 'Unknown' };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1E2761] via-[#408EC6] to-[#7A2048] text-black p-6">
      <div className="w-full max-w-4xl p-6 bg-gray-100 rounded-lg border border-gray-300 flex flex-col items-center">
        {/* Animated Checkmark */}
        <svg className="checkmark mb-4" viewBox="0 0 52 52">
          <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
          <path className="checkmark__check" fill="none" d="M14 27l7 7 16-16" />
        </svg>

        <h2 className="text-3xl font-semibold mb-4">Transaction {status}</h2>
        <p className="text-lg">Your transaction has been successfully completed!</p>
      </div>

      {/* checkmark animation */}
      <style>{`
        .checkmark {
          width: 72px;
          height: 72px;
        }
        .checkmark__circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          stroke-width: 2;
          stroke-miterlimit: 10;
          stroke: #4CAF50;
          fill: none;
          animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        .checkmark__check {
          transform-origin: 50% 50%;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          stroke: #4CAF50;
          stroke-width: 2;
          stroke-linecap: round;
          animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
        }
        @keyframes stroke {
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default SuccessPage;
