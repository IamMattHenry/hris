"use client";

import { useState, useEffect, useRef } from "react";
import { Fingerprint, Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { authApi, fingerprintApi } from "@/lib/api";

interface FingerprintAuth2FAProps {
  tempToken: string;
  expectedFingerprintId: number;
  employeeCode: string;
  onSuccess: (token: string, user: any) => void;
  onCancel: () => void;
  onSkip?: () => void;
}

export default function FingerprintAuth2FA({
  tempToken,
  expectedFingerprintId,
  employeeCode,
  onSuccess,
  onCancel,
  onSkip,
}: FingerprintAuth2FAProps) {
  const [status, setStatus] = useState<"idle" | "scanning" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState("Place your finger on the scanner");
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasStartedScan = useRef(false);

  useEffect(() => {
    // Auto-start scanning when component mounts
    if (!hasStartedScan.current) {
      hasStartedScan.current = true;
      startScanning();
    }

    return () => {
      // Cleanup SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setStatus("scanning");
      setMessage("Place your finger on the scanner...");
      setError(null);

      // Start fingerprint scan
      const result = await fingerprintApi.startScan();
      
      if (!result.success) {
        throw new Error(result.message || "Failed to start fingerprint scan");
      }

      // Connect to SSE for real-time updates
      connectToSSE();
    } catch (err: any) {
      console.error("Failed to start scan:", err);
      setError(err.message || "Failed to start fingerprint scanner");
      setStatus("error");
    }
  };

  const connectToSSE = () => {
    const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:3001";
    const eventSource = new EventSource(`${bridgeUrl}/events`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("SSE Event:", data);

        if (data.type === "fingerprint_scanned") {
          // Fingerprint detected - verify it
          handleFingerprintScanned(data.fingerprint_id);
        } else if (data.type === "scan") {
          setMessage(data.message || "Scanning...");
        }
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error:", err);
      eventSource.close();
    };
  };

  const handleFingerprintScanned = async (scannedFingerprintId: number) => {
    try {
      setStatus("verifying");
      setMessage("Verifying fingerprint...");

      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Verify fingerprint with backend
      const result = await authApi.verifyFingerprint(tempToken, scannedFingerprintId);

      if (result.success && result.data) {
        setStatus("success");
        setMessage("Fingerprint verified! Logging in...");
        
        // Call success callback with token and user data
        setTimeout(() => {
          onSuccess(result.data!.token, result.data!.user);
        }, 1000);
      } else {
        throw new Error(result.message || "Fingerprint verification failed");
      }
    } catch (err: any) {
      console.error("Fingerprint verification error:", err);
      setError(err.message || "Fingerprint does not match");
      setStatus("error");
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setError(null);
    hasStartedScan.current = false;
    startScanning();
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white mb-2">
          Two-Factor Authentication
        </h2>
        <p className="text-sm text-gray-300 mb-6">
          Scan your fingerprint to complete login
        </p>

        {/* Status Icon */}
        <div className="flex justify-center mb-6">
          {status === "scanning" && (
            <div className="relative">
              <Fingerprint className="w-24 h-24 text-[#D4A056] animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
            </div>
          )}
          {status === "verifying" && (
            <Loader2 className="w-24 h-24 text-[#D4A056] animate-spin" />
          )}
          {status === "success" && (
            <CheckCircle2 className="w-24 h-24 text-green-500" />
          )}
          {status === "error" && (
            <XCircle className="w-24 h-24 text-red-500" />
          )}
          {status === "idle" && (
            <Fingerprint className="w-24 h-24 text-gray-400" />
          )}
        </div>

        {/* Message */}
        <p className="text-white text-lg mb-4">{message}</p>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm text-left">{error}</p>
          </div>
        )}

        {/* Employee Info */}
        <div className="bg-white/5 rounded-lg p-3 mb-6">
          <p className="text-sm text-gray-300">Employee Code</p>
          <p className="text-lg font-semibold text-white">{employeeCode}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {status === "error" && (
            <button
              onClick={handleRetry}
              className="w-full bg-[#D4A056] hover:bg-[#C39046] text-white font-semibold py-3 rounded-lg transition"
            >
              Try Again
            </button>
          )}

          {status === "scanning" && (
            <button
              onClick={onCancel}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Cancel
            </button>
          )}

          {(status === "idle" || status === "error") && onSkip && (
            <button
              onClick={onSkip}
              className="w-full bg-transparent border border-white/30 hover:bg-white/10 text-white font-semibold py-3 rounded-lg transition"
            >
              Skip (Use Backup Method)
            </button>
          )}

          {(status === "idle" || status === "error" || status === "scanning") && (
            <button
              onClick={onCancel}
              className="w-full text-gray-300 hover:text-white text-sm transition"
            >
              Back to Login
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-xs text-gray-400 text-center">
          <p>Having trouble? Contact IT support for assistance.</p>
        </div>
      </div>
    </div>
  );
}

