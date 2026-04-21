"use client";

import { useState, useEffect, useRef } from "react";
import {
  UserIcon,
  Cog6ToothIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  FolderMinusIcon,
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
}

export default function Header({
  titleHeader = "Dashboard",
  adminName = "Admin Name",
  adminType = "Admin Type",
  dropdownItems,
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

  const handleNotifications = () => {
    console.log("Notifications clicked");
    window.location.href = "/dashboard/profile?section=notifications";
    setDropdownOpen(false);
  };

  const handleBudget = () => {
    console.log("Budget clicked");
    window.location.href = "/dashboard/settings?section=budget";
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    console.log("Logout clicked");
    setDropdownOpen(false);
    logout();
  };



  const defaultDropdown: DropdownItem[] = [
    { label: "Profile", icon: <UserIcon className="w-5 h-5" />, onClick: handleProfile },
    { label: "Notifications", icon: <BellIcon className="w-5 h-5" />, onClick: handleNotifications },
    { label: "Budget", icon: <FolderMinusIcon className="w-5 h-5" />, onClick: handleBudget },
    { label: "Settings", icon: <Cog6ToothIcon className="w-5 h-5" />, onClick: handleSettings },
    { label: "Logout", icon: <ArrowRightOnRectangleIcon className="w-5 h-5" />, onClick: handleLogout },
  ];

  const items = dropdownItems || defaultDropdown;

return (
  <header className="bg-[#FDF6EC] border-b border-[#F5E8D3]">
    <div className="max-w-8xl mx-auto px-8 py-5 flex items-center justify-between">
      {/* Left: Title */}
      <div className="flex items-center gap-6">
        <h1 className="text-4xl font-poppins font-medium tracking-tight text-[#3C1E1E]">
          {titleHeader}
        </h1>
      </div>

      {/* Right: User Dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 bg-[#FFF2E0] hover:bg-[#FFE9C9] text-[#4B0B14] 
                     px-6 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 
                     border border-[#F5E8D3] active:scale-[0.985]"
        >
          {/* Avatar */}
          <div className="w-9 h-9 bg-[#4B0B14] rounded-full text-white flex items-center justify-center 
                          font-semibold text-lg ring-2 ring-[#FFF2E0]">
            {adminName ? adminName[0].toUpperCase() : "A"}
          </div>

          {/* User Info */}
          <div className="flex flex-col text-left leading-tight">
            <span className="font-semibold font-poppins text-[15px]">{adminName}</span>
            <span className="text-xs text-[#8B5A3C] font-poppins">{adminType}</span>
          </div>

          {/* Dropdown Arrow */}
          <svg
            className={`w-5 h-5 ml-1 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <ul className="absolute right-0 mt-2 w-52 bg-[#FFF2E0] rounded-2xl shadow-xl 
                         border border-[#F5E8D3] overflow-hidden py-1 z-50">
            {items.map((item, idx) => {
              const isLogout = item.label.toLowerCase().includes("logout");

              return (
                <li
                  key={idx}
                  onClick={item.onClick}
                  className={`flex items-center gap-3 px-5 py-3 text-[#4B0B14] font-poppins 
                              hover:bg-[#FFE9C9] cursor-pointer transition-colors
                              ${isLogout ? "mt-2 border-t border-[#F5E8D3]" : ""}`}
                >
                  {item.icon}
                  <span className={isLogout ? "font-medium text-[#9F2A2A]" : ""}>
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  </header>
);
};
