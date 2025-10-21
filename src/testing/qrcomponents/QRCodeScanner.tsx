"use client";

import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useState } from "react";

export default function QRCodeScanner() {
  const [data, setData] = useState("");

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    },
    /* 👇 third argument: verbose (set to false to avoid logs) */
    false);

    scanner.render(
      (decodedText: string) => setData(decodedText),
      (errorMessage: string) => console.warn(errorMessage)
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  return (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-xl font-bold mb-4">QR Code Scanner</h2>
      <div id="reader" className="w-80 h-80 border rounded-lg" />
      <p className="mt-4 text-white-700 text-3xl">
        {data ? `✅ Scanned: ${data}` : "Waiting for QR..."}
      </p>
    </div>
  );
}
