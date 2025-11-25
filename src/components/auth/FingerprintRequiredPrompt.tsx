"use client";

import { AlertCircle, Fingerprint, HelpCircle } from "lucide-react";

interface FingerprintRequiredPromptProps {
  employeeCode: string;
  onContactSupport: () => void;
  onCancel: () => void;
  onContinueWithout2FA?: () => void;
}

export default function FingerprintRequiredPrompt({
  employeeCode,
  onContactSupport,
  onCancel,
  onContinueWithout2FA,
}: FingerprintRequiredPromptProps) {
  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
      <div className="text-center">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Fingerprint className="w-24 h-24 text-gray-400" />
            <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-2">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-white mb-2">
          Fingerprint Registration Required
        </h2>

        {/* Message */}
        <p className="text-gray-300 mb-6">
          Your account requires fingerprint authentication, but you don't have a fingerprint registered yet.
        </p>

        {/* Employee Info */}
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-300 mb-1">Employee Code</p>
          <p className="text-lg font-semibold text-white">{employeeCode}</p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-2">What to do next:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Contact IT Support or HR Department</li>
                <li>Request fingerprint registration</li>
                <li>Complete the registration process</li>
                <li>Return here to login</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onContactSupport}
            className="w-full bg-[#D4A056] hover:bg-[#C39046] text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <HelpCircle className="w-5 h-5" />
            Contact Support
          </button>

          {onContinueWithout2FA && (
            <button
              onClick={onContinueWithout2FA}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Continue Without 2FA (Not Recommended)
            </button>
          )}

          <button
            onClick={onCancel}
            className="w-full bg-transparent border border-white/30 hover:bg-white/10 text-white font-semibold py-3 rounded-lg transition"
          >
            Back to Login
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-xs text-gray-400">
          <p>For immediate assistance, contact:</p>
          <p className="font-semibold text-gray-300 mt-1">IT Support: ext. 1234</p>
        </div>
      </div>
    </div>
  );
}

