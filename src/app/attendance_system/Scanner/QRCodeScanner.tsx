"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

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
    // Delay initialization to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      const readerElement = document.getElementById("reader");
      if (readerElement && !html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current = new Html5Qrcode("reader");
        } catch (error) {
          console.error("Failed to initialize QR scanner:", error);
        }
      }
    }, 100);
    
    return () => {
      clearTimeout(initTimeout);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
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
        toast.error("No camera found!");
      }
    } catch (err) {
      console.error("Failed to start scanner:", err);
      toast.error("Failed to start camera scanner");
    }
  };

  // Auto-start scanner on mount
  useEffect(() => {
    if (isActive && !isScanning && html5QrCodeRef.current) {
      const startTimeout = setTimeout(() => {
        startScanner();
      }, 200);
      
      return () => clearTimeout(startTimeout);
    }
  }, [isActive, html5QrCodeRef.current]);

 
  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
      } catch (error) {
        console.error("Error stopping scanner:", error);
        setIsScanning(false);
      }
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
