"use client";
import Image from "next/image";

export default function AttendanceSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#4b0e0e] via-[#5b1212] to-[#250808] text-[#fdf3e2] relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-10 bg-repeat"></div>

      {/* Page container */}
      <div className="relative z-10 text-[#3b2b1c] w-full max-w-5xl px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-8 flex items-center justify-center">
            <Image
              src="/logo/celestia-hr-logo.png"
              alt="Logo"
              width={250}
              height={250}
              className="object-contain"
              priority
            />
          </div>
          <p className="text-sm font-medium text-[#fdf3e2]/80">
            Human Resource Information System
          </p>
        </div>

        {/* Dynamic page content */}
        <div>{children}</div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 text-xs text-[#fdf3e2]/70">
        © {new Date().getFullYear()} Celestia Hotel HRIS
      </footer>
    </div>
  );
}
