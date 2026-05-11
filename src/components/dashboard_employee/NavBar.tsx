"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { House, User, Users, UserCheck, Mail, Cog, LogOut, Banknote, Menu, X, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  
  // State to handle mobile menu toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = [
    { name: "Overview", icon: House, path: "/dashboard_employee" },
    { name: "Profile", icon: User, path: "/dashboard_employee/profile" },
    { name: "Dependant", icon: Users, path: "/dashboard_employee/dependant" },
    { name: "Attendance", icon: UserCheck, path: "/dashboard_employee/attendance" },
    { name: "Payslip", icon: Banknote, path: "/dashboard_employee/payslip" },
    { name: "Request", icon: Mail, path: "/dashboard_employee/request" },
    { name: "Due Process", icon: FileText, path: "/dashboard_employee/due_process" },
    { name: "Settings", icon: Cog, path: "/dashboard_employee/settings" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/login_employee";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <nav className="bg-[#073532] text-[#FFF2E0] font-poppins shadow-xl sticky top-0 z-50">
      {/* Changed to standard max-w-[1440px] as max-w-8xl is non-standard in default Tailwind */}
      <div className="max-w-[1440px] mx-auto px-6 py-3 lg:px-8 lg:py-4">
        <div className="flex items-center justify-between">
          
          {/* Logo Section - Wrapped in Link to act as a home button */}
          <Link href="/dashboard_employee" className="flex items-center gap-3 transition-transform hover:scale-105">
            <Image
              src="/logo/celestia-logo.png"
              alt="Celestia Logo"
              width={40}
              height={40}
              className="object-contain w-12 h-12 lg:w-[60px] lg:h-[60px]"
              priority
            />
            <h2 className="text-2xl lg:text-1xl font-thin text-[#D4A056] font-abril tracking-wide">
              CELESTIA <span className="hidden sm:inline">Hotel</span>
            </h2>
          </Link>

          {/* Desktop Navigation Links (Hidden on small screens, shown on Extra Large due to amount of links) */}
          <ul className="hidden xl:flex items-center space-x-1 lg:space-x-2">
            {links.map(({ name, icon: Icon, path }) => {
              const isActive = pathname === path;
              return (
                <li key={name}>
                  <Link
                    href={path}
                    className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-[#114945] text-[#D4A056] shadow-inner font-medium"
                        : "hover:bg-[#1a4d4a] hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${isActive ? "text-[#D4A056]" : "opacity-80"}`} />
                    <span className="text-sm lg:text-base">{name}</span>
                  </Link>
                </li>
              );
            })}
            
            {/* Desktop Logout Button */}
            <div className="pl-4 ml-2 border-l border-[#1a4d4a]">
              <button
                className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 text-[#FFF2E0] border border-transparent hover:border-[#ff6b6b] hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm lg:text-base">Logout</span>
              </button>
            </div>
          </ul>

          {/* Mobile Menu Toggle Button */}
          <button
            className="xl:hidden p-2 rounded-md hover:bg-[#1a4d4a] transition-colors focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-7 h-7 text-[#D4A056]" />
            ) : (
              <Menu className="w-7 h-7 text-[#D4A056]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      <div
        className={`xl:hidden transition-all duration-300 ease-in-out overflow-hidden ${
          isMobileMenuOpen ? "max-h-[500px] border-t border-[#1a4d4a] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="px-4 py-4 space-y-2 bg-[#052826]">
          {links.map(({ name, icon: Icon, path }) => {
            const isActive = pathname === path;
            return (
              <li key={name}>
                <Link
                  href={path}
                  onClick={() => setIsMobileMenuOpen(false)} // Close menu on click
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-[#114945] text-[#D4A056] font-medium"
                      : "hover:bg-[#1a4d4a]"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-[#D4A056]" : "opacity-80"}`} />
                  <span>{name}</span>
                </Link>
              </li>
            );
          })}
          
          {/* Mobile Logout */}
          <li className="pt-4 mt-2 border-t border-[#1a4d4a]">
            <button
              className="flex items-center w-full space-x-3 px-4 py-3 rounded-lg transition-colors text-[#ff6b6b] hover:bg-[#ff6b6b]/10"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}