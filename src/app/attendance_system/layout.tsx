"use client";
import Image from "next/image";

export default function AttendanceSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-[#2b0909] via-[#4b0e0e] to-[#1a0505] text-[#fdf3e2] relative overflow-x-hidden font-poppins">
      
      {/* Decorative Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#D4A056] opacity-[0.03] blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute inset-0 opacity-[0.02] bg-[url('/noise.png')] bg-repeat pointer-events-none"></div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 relative z-10 py-10">
        
        {/* Header Section */}
        <header className="text-center mb-10 w-full flex flex-col items-center">
          <div className="relative mb-6 transform transition-transform duration-500 hover:scale-105">
            <Image
              src="/logo/celestia-hr-logo.png"
              alt="Celestia Hotel HR Logo"
              width={250}
              height={250}
              className="object-contain w-48 sm:w-56 md:w-64 drop-shadow-2xl"
              priority
            />
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-[1px] bg-[#D4A056]/50 mb-4"></div>
            <p className="text-xs sm:text-sm font-medium text-[#fdf3e2]/70 tracking-[0.2em] uppercase">
              Human Resource Information System
            </p>
          </div>
        </header>

        {/* Dynamic Page Content (The Auth Portal / Kiosk) */}
        <main className="w-full text-[#3b2b1c] animate-in fade-in slide-in-from-bottom-4 duration-700 ease-in-out">
          {children}
        </main>
        
      </div>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs sm:text-sm text-[#fdf3e2]/40 tracking-wider relative z-10 mt-auto">
        <p>© {new Date().getFullYear()} Celestia Hotel HRIS. All rights reserved.</p>
      </footer>
      
    </div>
  );
}