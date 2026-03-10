"use client";

import { useState, useEffect, useRef } from "react";
import {
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";

interface DropdownItem {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface DashboardHeaderProps {
  titleHeader?: string;
  adminName?: string;
  adminType?: string;
  dropdownItems?: DropdownItem[];
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({
  titleHeader = "Dashboard",
  adminName = "Admin Name",
  adminType = "Admin Type",
  dropdownItems,
  sidebarOpen,
  setSidebarOpen,
}: DashboardHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfile = () => {
    console.log("Profile clicked");
    // Redirect to profile page
    window.location.href = "/dashboard/profile";
    console.log("Profile clicked");
    setDropdownOpen(false);
  };

  const handleSettings = () => {
    console.log("Settings clicked");
    window.location.href = "/dashboard/settings";
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    console.log("Logout clicked");
    setDropdownOpen(false);
    logout();
  };

  const defaultDropdown: DropdownItem[] = [
    { label: "Profile", icon: <UserIcon className="w-5 h-5" />, onClick: handleProfile },
    { label: "Settings", icon: <Cog6ToothIcon className="w-5 h-5" />, onClick: handleSettings },
    { label: "Logout", icon: <ArrowRightOnRectangleIcon className="w-5 h-5" />, onClick: handleLogout },
  ];

  const items = dropdownItems || defaultDropdown;

  return (
    <header className="bg-[#FDF6EC] sticky top-0 z-30">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Left: Title and Toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-700"
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-2xl md:text-3xl font-poppins font-[400] text-[#3C1E1E]">{titleHeader}</h1>
        </div>

        {/* Right: User Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 bg-[#FFF2E0] text-[#4B0B14] px-4 py-2 rounded-lg shadow hover:shadow-md transition cursor-pointer"
          >
            <div className="w-8 h-8 bg-[#4B0B14] rounded-full text-white flex items-center justify-center font-semibold">
              {adminName ? adminName[0].toUpperCase() : "A"}
            </div>
            <div className="flex flex-col text-left">
              <span className="font-semibold font-poppins text-sm">{adminName}</span>
              <span className="text-xs text-gray-500 font-poppins">{adminType}</span>
            </div>
            <svg
              className={`w-4 h-4 ml-1 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <ul className="absolute text-[#4B0B14] font-poppins right-0 mt-2 px-0 py-2 w-44 bg-[#FFF2E0] z-70 rounded-md shadow-lg overflow-hidden">
              {items.map((item, idx) => (
                <li
                  key={idx}
                  onClick={item.onClick}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-yellow-100 cursor-pointer"
                >
                  {item.icon}
                  {item.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  );
}
