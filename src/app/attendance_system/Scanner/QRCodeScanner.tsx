"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { Camera, StopCircle, AlertCircle, ScanLine } from "lucide-react";

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

  const stopAndClearScanner = async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) return;

    try {
      // Force stop regardless of getState() to ensure hardware releases
      if (scanner.isScanning) { 
        await scanner.stop();
      }
    } catch (err) {
      console.warn("Scanner stop error (safe to ignore):", err);
    }

    try {
      scanner.clear();
    } catch (err) {
      console.warn("Scanner clear error:", err);
    }
    
    // Explicitly kill all active video tracks to shut off the webcam light
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      // Ignore errors here if permission isn't granted or no camera exists
    }

    setIsScanning(false);
  };

  useEffect(() => {
    // Only initialize the class instance once
    if (!html5QrCodeRef.current && document.getElementById("reader")) {
      html5QrCodeRef.current = new Html5Qrcode("reader");
    }

    return () => {
      stopAndClearScanner();
    };
  }, []);

  const startScanner = async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner || isOperatingRef.current) return;

    if (scanner.getState() === 2) {
      setIsScanning(true);
      return;
    }

    isOperatingRef.current = true;
    setError("");

    try {
      // Step 1: Check if browser supports mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser blocks camera access on HTTP. Use localhost or HTTPS.");
      }

      // Step 2: Request devices
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error("No camera hardware found on this device.");
      }

      const cameraId = devices[0].id;
      
      // Step 3: Start hardware
      await scanner.start(
        cameraId,
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0 // <-- ADDED: Forces the library to expect a square feed
        },
        (decodedText) => {
          if (decodedText && decodedText !== lastScannedRef.current) {
            lastScannedRef.current = decodedText;
            onScan(decodedText);
            setTimeout(() => { lastScannedRef.current = ""; }, 2000);
          }
        },
        () => {} // Ignore frame errors
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera Init Error:", err);
      
      // Provide exact, human-readable error reasons
      if (err.name === "NotAllowedError" || err.message.includes("Permission denied")) {
        setError("Camera access was denied. Please allow permissions in your URL bar.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found or camera is being used by another app.");
      } else {
        setError(err.message || "Failed to start camera. Check console for details.");
      }
      
      setIsScanning(false);
    } finally {
      isOperatingRef.current = false;
    }
  };

  const stopScanner = async () => {
    // Removed the early return so it always attempts to stop when clicked
    isOperatingRef.current = true;
    try {
      await stopAndClearScanner();
    } finally {
      isOperatingRef.current = false;
    }
  };

  useEffect(() => {
    // Add a slight delay to bypass React 18 Strict Mode double-mount issues
    const timer = setTimeout(() => {
      if (isActive && !isScanning) startScanner();
      else if (!isActive && isScanning) stopScanner();
    }, 300); 

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isScanning]);

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-100 font-poppins">
      <div className="flex items-center gap-2 mb-5 w-full text-[#3D1A0B]">
        <ScanLine className="w-6 h-6" />
        <h3 className="text-lg font-semibold tracking-tight">Scan QR Code</h3>
      </div>

      <div 
        className={`relative w-full aspect-square rounded-xl overflow-hidden transition-all duration-300 flex items-center justify-center ${
          isScanning 
            ? "border-4 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] bg-black" 
            : "border-2 border-dashed border-[#E8D9C4] bg-[#FAF6F1]"
        }`}
      >
        {/* 👇 UPDATED: Added Tailwind arbitrary variants to force video to cover the area */}
        <div 
          id="reader" 
          className="w-full h-full [&_video]:!object-cover [&_video]:!w-full [&_video]:!h-full [&_video]:!min-h-full" 
        />

        {!isScanning && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#3D1A0B]/50">
            <Camera className="w-10 h-10 mb-2 opacity-60" />
            <span className="text-sm font-medium">Camera is inactive</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-4 text-red-600 bg-red-50 px-4 py-3 rounded-lg w-full border border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium text-left leading-snug">{error}</span>
        </div>
      )}

      <div className="w-full mt-6">
        
      </div>
    </div>
  );
}