"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

interface QRCodeScannerProps {
  onScan: (value: string) => void;
  isActive?: boolean;
}

export default function QRCodeScanner({ onScan, isActive = true }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>("");
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>("");
  const isOperatingRef = useRef(false);

  // Initialize scanner once
  useEffect(() => {
    const readerElement = document.getElementById("reader");
    if (readerElement && !html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode("reader");
    }

    return () => {
      // Cleanup on unmount
      const scanner = html5QrCodeRef.current;
      if (scanner) {
        const state = scanner.getState();
        if (state === 2) { // SCANNING state
          scanner.stop().catch(() => {}).finally(() => {
            scanner.clear();
          });
        } else {
          scanner.clear();
        }
        html5QrCodeRef.current = null;
      }
    };
  }, []);

  // Start scanner
  const startScanner = async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner || isOperatingRef.current) {
      return;
    }

    // Check actual scanner state
    const state = scanner.getState();
    if (state === 2) { // Already scanning
      setIsScanning(true);
      return;
    }

    isOperatingRef.current = true;
    setError("");

    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setError("No camera found!");
        return;
      }

      const cameraId = devices[0].id;
      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (decodedText && decodedText !== lastScannedRef.current) {
            lastScannedRef.current = decodedText;
            onScan(decodedText);
            
            // Reset after 2 seconds to allow re-scanning
            setTimeout(() => {
              lastScannedRef.current = "";
            }, 2000);
          }
        },
        () => {
          // Silently ignore decode errors (normal during scanning)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Failed to start scanner:", err);
      setError("Failed to start camera. Please check permissions.");
      setIsScanning(false);
    } finally {
      isOperatingRef.current = false;
    }
  };

  // Stop scanner safely
  const stopScanner = async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner || isOperatingRef.current) {
      return;
    }

    // Check actual scanner state
    const state = scanner.getState();
    if (state !== 2) { // Not scanning
      setIsScanning(false);
      return;
    }

    isOperatingRef.current = true;

    try {
      await scanner.stop();
      scanner.clear();
      setIsScanning(false);
      lastScannedRef.current = "";
    } catch (err) {
      console.warn("Error stopping scanner:", err);
      // Force state sync
      setIsScanning(false);
    } finally {
      isOperatingRef.current = false;
    }
  };

  // Auto-start/stop when isActive changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isActive && !isScanning) {
        startScanner();
      } else if (!isActive && isScanning) {
        stopScanner();
      }
    }, 100); // Small delay to prevent race conditions

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isScanning]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        id="reader" 
        className="w-[300px] border-2 border-gray-300 rounded-lg overflow-hidden"
        style={{ minHeight: '250px' }}
      />

      {error && (
        <div className="text-red-600 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="flex gap-3 mt-2">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={isOperatingRef.current}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Camera
          </button>
        ) : (
          <button
            onClick={stopScanner}
            disabled={isOperatingRef.current}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Stop Camera
          </button>
        )}
      </div>
    </div>
  );
}