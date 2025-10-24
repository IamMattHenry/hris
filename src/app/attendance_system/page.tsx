"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import QRCodeScanner from "./Scanner/QRCodeScanner";

export default function AttendanceSystemPage() {
  const [qrValue, setQrValue] = useState("");

  const currentDate = new Date().toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <section className="bg-[#fff7ec] rounded-2xl shadow-2xl w-full font-poppins max-w-4xl px-10 py-8 mx-auto">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-3xl font-extrabold text-[#3b2b1c]">QR SCAN</h3>
        <p className="text-[#3b2b1c]/80 text-base">{currentDate}</p>
      </div>

      {/* Status Line */}
      <div className="flex items-center gap-2 mb-5 text-[#8b7355] text-lg">
        {!qrValue ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-[#b97a5b]" />
            <span>Waiting For QR...</span>
          </>
        ) : (
          <span className="text-green-700 font-semibold text-lg">
            ✅ Scanned: {qrValue}
          </span>
        )}
      </div>

      {/* QR and Info */}
      <div className="flex gap-8 items-start">
        {/* QR Scanner Section */}
        <div className="flex flex-col items-center justify-center bg-[#f4eadb] rounded-xl shadow-inner p-4">
          <QRCodeScanner onScan={(value) => setQrValue(value)} />
        </div>

        {/* Employee Info Section */}
        <div className="flex-1 space-y-5">
          <div className="border rounded-xl border-[#e2cfa8] p-4 mb-5">
            <p className="font-semibold text-xl text-[#3b2b1c]">
              Employee Name
            </p>
            <p className="text-lg text-[#8b7355]">Position</p>
          </div>

          <div className="text-base space-y-4">
            <div className="flex justify-between items-center">
              <p>
                <span className="font-semibold text-[#3b2b1c]">Schedule:</span>{" "}
                Wed, 2:30 PM – 8:00 PM
              </p>
              <p>
                <span className="font-semibold text-[#3b2b1c]">Remarks:</span>{" "}
                <span className="bg-[#e5e5e5] text-gray-700 px-3 py-1 rounded-md">
                  None
                </span>
              </p>
            </div>

            <div className="flex justify-between">
              <p>
                <span className="font-semibold text-[#3b2b1c]">Time In:</span>{" "}
                2:30 PM
              </p>
              <p>
                <span className="font-semibold text-[#3b2b1c]">Time Out:</span>{" "}
                --:--
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
