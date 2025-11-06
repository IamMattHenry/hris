"use client";

import React, { useState, useEffect } from "react";
import { Fingerprint, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { fingerprintApi } from "@/lib/api";

interface FingerprintEnrollmentProps {
  employeeId?: number;
  onEnrollmentComplete?: (fingerprintId: number) => void;
  onSkip?: () => void;
}

export default function FingerprintEnrollment({
  employeeId,
  onEnrollmentComplete,
  onSkip,
}: FingerprintEnrollmentProps) {
  const [fingerprintId, setFingerprintId] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "enrolling" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [statusLog, setStatusLog] = useState<Array<{ message: string; type: string; timestamp: string }>>([]);

  // Auto-fetch next available fingerprint ID on mount
  useEffect(() => {
    fetchNextFingerprintId();
  }, []);

  // Connect to SSE for real-time status updates
  useEffect(() => {
    if (status !== "enrolling") return;

    const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3001';
    const eventSource = new EventSource(`${bridgeUrl}/status/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatusLog((prev) => [...prev, data]);

      // Auto-detect enrollment success and auto-confirm
      if (data.message.includes('ENROLL:SUCCESS') || data.message.includes('Enrollment successful')) {
        setStatus('success');
        setMessage('Fingerprint enrolled successfully! Saving to database...');
        
        // Auto-confirm enrollment to save to database
        if (fingerprintId && employeeId) {
          setTimeout(() => {
            autoConfirmEnrollment();
          }, 500);
        }
      }

      // Auto-detect enrollment errors
      if (data.message.includes('ENROLL:ERROR') || data.message.includes('already exists in sensor') || data.message.includes('already registered')) {
        setStatus('error');
        setError(data.message.replace('ENROLL:ERROR:', '').replace('ERROR:', ''));
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');
    };

    return () => {
      eventSource.close();
    };
  }, [status]);

  const fetchNextFingerprintId = async () => {
    try {
      setStatus("loading");
      const result = await fingerprintApi.getNextId();
      if (result.success) {
        setFingerprintId(result.data.next_fingerprint_id);
        setStatus("idle");
      } else {
        setError("Failed to get next fingerprint ID");
        setStatus("error");
      }
    } catch (err) {
      setError("Error fetching fingerprint ID");
      setStatus("error");
    }
  };

  const handleStartEnrollment = async () => {
    if (!fingerprintId) {
      setError("Please enter a fingerprint ID");
      return;
    }

    if (!employeeId) {
      setError("Employee ID is required");
      return;
    }

    try {
      setStatus("loading");
      setError("");

      // Check if fingerprint ID is available
      const checkResult = await fingerprintApi.checkId(fingerprintId);
      if (checkResult.success && checkResult.data && !checkResult.data.available) {
        setError(checkResult.message || "Fingerprint ID is already in use");
        setStatus("error");
        return;
      }

      // Start enrollment
      const result = await fingerprintApi.startEnrollment(employeeId, fingerprintId);
      if (result.success) {
        setStatus("enrolling");
        setMessage(`Enrollment started for ID ${fingerprintId}. Follow the instructions below.`);
        
        // Note: The Arduino will handle the enrollment process
        // User needs to manually confirm when Arduino shows success
      } else {
        setError(result.message || "Failed to start enrollment");
        setStatus("error");
      }
    } catch (err) {
      setError("Error starting enrollment");
      setStatus("error");
    }
  };

  const autoConfirmEnrollment = async () => {
    if (!fingerprintId || !employeeId) return;

    try {
      const result = await fingerprintApi.confirmEnrollment(employeeId, fingerprintId);
      
      if (result.success) {
        setMessage("Fingerprint enrolled and saved to database successfully!");
        
        // Arduino automatically returns to attendance mode, no need to switch manually
        
        // Notify parent component
        setTimeout(() => {
          onEnrollmentComplete && onEnrollmentComplete(fingerprintId);
        }, 1500);
      } else {
        setError(result.message || "Failed to save to database");
        setStatus("error");
      }
    } catch (err) {
      setError("Error saving to database");
      setStatus("error");
    }
  };

  const handleConfirmEnrollment = async () => {
    if (!fingerprintId || !employeeId) return;

    try {
      setStatus("loading");
      const result = await fingerprintApi.confirmEnrollment(employeeId, fingerprintId);
      
      if (result.success) {
        setStatus("success");
        setMessage("Fingerprint enrolled and saved successfully!");
        
        // Arduino automatically returns to attendance mode, no need to switch manually
        
        // Notify parent component
        setTimeout(() => {
          onEnrollmentComplete && onEnrollmentComplete(fingerprintId);
        }, 1500);
      } else {
        setError(result.message || "Failed to confirm enrollment");
        setStatus("error");
      }
    } catch (err) {
      setError("Error confirming enrollment");
      setStatus("error");
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <Fingerprint className="w-6 h-6 text-[#8b7355]" />
        <h3 className="text-lg font-semibold text-[#3b2b1c]">Fingerprint Enrollment</h3>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {message && status !== "error" && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">{message}</p>
        </div>
      )}

      {status === "success" && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">Fingerprint enrolled successfully!</p>
        </div>
      )}

      {/* Fingerprint ID Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fingerprint ID
        </label>
        <input
          type="number"
          value={fingerprintId || ""}
          onChange={(e) => setFingerprintId(parseInt(e.target.value) || null)}
          disabled={status === "enrolling" || status === "success"}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b7355] focus:border-transparent disabled:bg-gray-100"
          placeholder="Enter fingerprint ID"
        />
        <p className="mt-1 text-xs text-gray-500">
          This ID will be stored in the fingerprint sensor and linked to this employee.
        </p>
      </div>

      {/* Real-time Status Log */}
      {status === "enrolling" && (
        <div className="mb-4">
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2 text-white border-b border-gray-700 pb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-semibold">Live Status</span>
            </div>
            {statusLog.length === 0 ? (
              <div className="text-gray-500 italic">Waiting for sensor response...</div>
            ) : (
              <div className="space-y-1">
                {statusLog.map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-gray-500 text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={
                      log.message.includes('success') || log.message.includes('Stored') || log.message.includes('matched') 
                        ? 'text-green-400' 
                        : log.message.includes('error') || log.message.includes('failed')
                        ? 'text-red-400'
                        : log.message.includes('Remove') || log.message.includes('Place')
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 <strong>Follow the instructions above.</strong> The enrollment process requires scanning your finger twice.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {status === "idle" || status === "error" ? (
          <>
            <button
              onClick={handleStartEnrollment}
              disabled={!fingerprintId || !employeeId}
              className="flex-1 bg-[#8b7355] hover:bg-[#6d5a43] disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-4 h-4" />
              Start Enrollment
            </button>
            {onSkip && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Skip
              </button>
            )}
          </>
        ) : status === "loading" ? (
          <button
            disabled
            className="flex-1 bg-gray-300 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </button>
        ) : status === "enrolling" ? (
          <button
            onClick={handleConfirmEnrollment}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Confirm Enrollment
          </button>
        ) : status === "success" ? (
          <button
            onClick={() => onEnrollmentComplete && onEnrollmentComplete(fingerprintId!)}
            className="flex-1 bg-[#8b7355] hover:bg-[#6d5a43] text-white font-medium py-2 px-4 rounded-lg transition"
          >
            Continue
          </button>
        ) : null}
      </div>

      {/* Additional Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> Make sure the Arduino fingerprint sensor is connected and the bridge service is running before starting enrollment.
        </p>
      </div>
    </div>
  );
}
