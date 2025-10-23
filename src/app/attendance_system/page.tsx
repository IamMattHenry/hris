// app/page.tsx (Next.js 13+ /app directory)
"use client"

import QRCodeGenerator from "@/testing/qrcomponents/QRCodeGenerator";
import QRCodeScanner from "@/testing/qrcomponents/QRCodeScanner";

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <QRCodeGenerator />
      <QRCodeScanner />
    </div>
  );
}
