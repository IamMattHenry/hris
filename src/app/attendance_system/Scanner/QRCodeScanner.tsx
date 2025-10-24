"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

interface QRCodeScannerProps {
  onScan: (value: string) => void;
  isActive?: boolean;
}

export default function QRCodeScanner({ onScan, isActive = true }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>("");

  // Initialize the QR code instance once
  useEffect(() => {
    html5QrCodeRef.current = new Html5Qrcode("reader");
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current.clear();
      }
    };
  }, []);

  // Start scanning
  const startScanner = async () => {
    if (!html5QrCodeRef.current || !isActive) return;

    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        const cameraId = devices[0].id;
        await html5QrCodeRef.current.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 200, height: 200 },
          },
          (decodedText) => {
            // Prevent duplicate scans
            if (decodedText !== lastScannedRef.current) {
              lastScannedRef.current = decodedText;
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            
          }
        );
        setIsScanning(true);
      } else {
        alert("No camera found!");
      }
    } catch (err) {
      console.error("Failed to start scanner:", err);
    }
  };

  // Auto-start scanner on mount
  useEffect(() => {
    if (isActive && !isScanning) {
      startScanner();
    }
  }, [isActive]);

 
  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      await html5QrCodeRef.current.stop();
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        id="reader"
        className="w-[250px] h-[200px] overflow-hidden"
      ></div>

      <div className="flex gap-3 mt-2">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Start Camera
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Stop Camera
          </button>
        )}
      </div>
    </div>
  );
}
