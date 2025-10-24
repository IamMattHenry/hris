"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ChevronDown, ChevronUp } from "lucide-react";

interface QRCodeGeneratorProps {
  defaultText: string; // required text (employee data, etc.)
  size?: number; // QR size in px (default 160)
}

export default function QRCodeGenerator({
  defaultText,
  size = 160,
}: QRCodeGeneratorProps) {
  const [qrUrl, setQrUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Generate QR automatically
  useEffect(() => {
    if (!defaultText.trim()) return;

    const generate = async () => {
      setLoading(true);
      try {
        const url = await QRCode.toDataURL(defaultText, {
          width: size,
          margin: 1,
          color: {
            dark: "#3b2b1c", // Celestia brown
            light: "#fff7ec", // soft beige
          },
        });
        setQrUrl(url);
      } catch (err) {
        console.error("QR generation failed:", err);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [defaultText, size]);

  // Download QR as PNG
  const downloadQR = () => {
    if (!qrUrl) return;
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = "employee_qrcode.png";
    link.click();
  };

  return (
    <div className="bg-[#fff7ec] rounded-xl shadow-md w-full max-w-sm mx-auto">
      {/* Dropdown Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-[#3b2b1c] cursor-pointer font-semibold hover:bg-[#f2e4ce] rounded-t-xl transition"
      >
        <span>Employee QR Code</span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="p-4 border-t border-[#d6c3aa] flex flex-col items-center space-y-2">
          {loading ? (
            <p className="text-sm text-gray-500">Generating QR...</p>
          ) : (
            <>
              <img
                src={qrUrl}
                alt="Employee QR Code"
                className="rounded-lg border border-[#d6c3aa] bg-white p-1"
                width={size}
                height={size}
              />
              <button
                onClick={downloadQR}
                className="bg-green-700 text-white text-sm px-3 py-1.5 rounded-md hover:bg-green-800 transition"
              >
                Download QR
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
