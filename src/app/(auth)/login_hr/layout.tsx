
import Image from "next/image";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login - Celestia",
};

export default function LoginHR({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen flex lg:flex-row overflow-hidden">
      {/* Left panel */}
      <div
        className="
          hidden lg:flex lg:w-1/2 
          bg-gradient-to-br from-[#3b0a0a] to-[#1e0000] 
          flex-col items-center justify-center 
          text-center text-gold p-6 sm:p-10 
          transition-all duration-700 ease-in-out
          z-20
          relative
        "
      >
        <Image
          src="/logo/celestia-logo.png"
          alt="Celestia Logo"
          className="mb-6 w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80"
          width={360}
          height={360}
        />
        <h1 className="text-3xl sm:text-4xl font-thin text-[#D4A056] font-abril">
          CELESTIA HOTEL
        </h1>
        <p className="text-base sm:text-lg text-[#D4A056]/80 mt-2">
          Human Resource Information System
        </p>
        <div className="absolute bottom-4 left-4 text-xs text-yellow-800 opacity-60 flex items-center">
          <Image src="/logo/logo_outline.png" alt="Celestia Logo" width={32} height={32} />
          <span className="ml-1 text-base">© Celestia Hotel 2025</span>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center bg-cover bg-center relative p-4"
        style={{ backgroundImage: "url('/assets/login-bg-hr.png')" }}
      >
        <div className="bg-black/10 absolute inset-0"></div>
        <div className="relative z-10 w-full flex justify-center">{children}</div>
      </div>
    </section>
  );
}
