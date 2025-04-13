import React from 'react';
import { useLocation } from 'react-router-dom';

const SuccessPage: React.FC = () => {
  const location = useLocation();
  const { status } = location.state || { status: 'Unknown' };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f172a] overflow-hidden text-white p-6">
      {/* Glowing orbs */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-[-100px] right-[-100px] w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-pulse delay-200" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl p-8 bg-white/10 text-white rounded-3xl shadow-2xl backdrop-blur-md border border-white/20 flex flex-col items-center">
        <div className="success-animation mb-6">
          <svg className="animated-check" viewBox="0 0 70 70">
            <circle className="path circle" cx="35" cy="35" r="30" />
            <polyline className="path check" points="23,34 34,45 49,27" />
          </svg>
        </div>

        <h2 className="text-4xl font-bold mb-4">Transaction {status}</h2>
        <p className="text-lg text-white/80 text-center">
          Your transaction has been successfully completed!
        </p>
      </div>

      <style>{`
        .success-animation {
          display: inline-block;
        }

        .animated-check {
          width: 96px;
          height: 96px;
        }

        .path {
          fill: none;
          stroke: #4caf50;
          stroke-width: 5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .circle {
          stroke-dasharray: 190;
          stroke-dashoffset: 190;
          animation: drawCircle 0.8s ease-out forwards;
        }

        .check {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: drawCheck 0.5s ease-out 0.8s forwards;
        }

        @keyframes drawCircle {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes drawCheck {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default SuccessPage;
