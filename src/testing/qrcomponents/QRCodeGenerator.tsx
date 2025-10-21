"use client";

import { useState } from "react";
import QRCode from "qrcode";

export default function QRCodeGenerator() {
  const [text, setText] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const generateQRCode = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const url = await QRCode.toDataURL(text, {
        width: 256,
        margin: 2,
        color: {
          dark: "#3b2b1c",
          light: "#ffffff",
        },
      });
      setQrUrl(url);
    } catch (err) {
      console.error("QR generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = "qrcode.png";
    link.click();
  };

  return (
    <div className="p-6 bg-[#fff7ec] rounded-2xl shadow-md max-w-md mx-auto space-y-4">
      <h2 className="text-2xl font-extrabold text-[#3b2b1c]">
        QR Code Generator
      </h2>

      <input
        type="text"
        placeholder="Enter text or URL"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="border border-[#d6c3aa] p-3 rounded-lg w-full text-black focus:outline-none focus:ring-2 focus:ring-[#3b2b1c]"
      />

      <button
        onClick={generateQRCode}
        disabled={loading}
        className="bg-[#3b2b1c] text-white px-4 py-2 rounded-lg hover:opacity-80 disabled:opacity-50 transition"
      >
        {loading ? "Generating..." : "Generate QR Code"}
      </button>

      {qrUrl && (
        <div className="flex flex-col items-center space-y-3">
          <img
            src={qrUrl}
            alt="Generated QR Code"
            className="border border-[#d6c3aa] rounded-xl p-2 bg-white"
          />
          <button
            onClick={downloadQR}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Download QR
          </button>
        </div>
      )}
    </div>
  );
}
