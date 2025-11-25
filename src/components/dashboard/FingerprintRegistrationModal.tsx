"use client";

import { useState } from "react";
import { AlertCircle, Fingerprint, HelpCircle, X } from "lucide-react";

interface FingerprintRegistrationModalProps {
  employeeCode: string;
  onContactSupport: () => void;
  onDismiss: () => void;
}

export default function FingerprintRegistrationModal({
  employeeCode,
  onContactSupport,
  onDismiss,
}: FingerprintRegistrationModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative">
        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="bg-yellow-100 rounded-full p-6">
                <Fingerprint className="w-16 h-16 text-yellow-600" />
              </div>
              <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-2">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-800 mb-3 text-center">
            Fingerprint Registration Required
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-6 text-center">
            Your account requires fingerprint authentication for enhanced security, but you don't have a fingerprint registered yet.
          </p>

          {/* Employee Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1 text-center">Employee Code</p>
            <p className="text-xl font-bold text-gray-800 text-center">{employeeCode}</p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-2 text-blue-800">What to do next:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Contact IT Support or HR Department</li>
                  <li>Request fingerprint registration</li>
                  <li>Complete the registration process</li>
                  <li>Enjoy enhanced security on your next login</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onContactSupport}
              className="w-full bg-[#8b4513] hover:bg-[#a0522d] text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <HelpCircle className="w-5 h-5" />
              Contact Support
            </button>

            <button
              onClick={onDismiss}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition"
            >
              Remind Me Later
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>For immediate assistance, contact:</p>
            <p className="font-semibold text-gray-700 mt-1">IT Support: ext. 1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}

