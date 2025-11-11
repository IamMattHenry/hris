import Image from "next/image";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employee Login - Celestia",
};

export default function LoginEmployee({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen flex overflow-hidden">
      {/* Left panel */}
      <div
        className="
          w-1/2 
          bg-gradient-to-br from-[#041f1e] to-[#073532] 
          flex flex-col items-center justify-center 
          text-center text-gold px-10 
          transition-all duration-700 ease-in-out
          hover:w-3/4
          z-20
        "
      >
        <Image
          src="/logo/celestia-logo.png"
          alt="Celestia Logo"
          className="mb-6"
          width={360}
          height={360}
        />
        <h1 className="text-4xl font-thin text-[#D4A056] font-abril">
          CELESTIA HOTEL
        </h1>
        <p className="text-lg text-[#D4A056]/80 mt-2">
          Hotel Employee Portal
        </p>
        <div className="absolute bottom-4 left-4 text-xs text-white opacity-60 flex items-center">
          <Image src="/logo/logo_outline.png" alt="Celestia Logo" width={48} height={48} />
          <span className="ml-1 text-sm">© Celestia Hotel 2025</span>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="w-1/2 flex items-center justify-center bg-cover bg-center relative"
        style={{ backgroundImage: "url('/assets/login-bg-emp.png')" }}
      >
        <div className="bg-black/10 absolute inset-0"></div>
        <div className="relative z-10">{children}</div>
      </div>
    </section>
  );
}
