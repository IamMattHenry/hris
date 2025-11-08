"use client";
import { useState, useEffect } from "react";
import AboutUserTab from "./user_setting/page";
import AuthenticationTab from "./user_auth/page";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("about");
  const [isITadmin, setIsITAdmin] = useState(false);
  const { user } = useAuth();

  // Wait until user context is loaded
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (user !== undefined) setIsLoading(false);
  }, [user]);

  // Check role when user is available
  useEffect(() => {
    if (user?.role === "superadmin") {
      setIsITAdmin(true);
      console.log("✅ IT Admin detected");
    } else {
      setIsITAdmin(false);
      console.log("Not IT admin");
    }
  }, [user]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#4B0B14] font-semibold">
        Loading settings...
      </div>
    );
  }

  // Handle logged-out state safely
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-3 bg-orange-50 text-[#4B0B14] font-medium">
        <p>You are not logged in.</p>
        <a
          href="/login"
          className="px-5 py-2 bg-[#4B0B14] text-[#FFF2E0] rounded-lg hover:bg-[#6b0b1f] transition"
        >
          Go to Login
        </a>
      </div>
    );
  }

  // Tabs
  const tabs = [
    { id: "about", label: "About User" },
    { id: "auth", label: "Authentication" },
  ];

  return (
    <div className="min-h-screen bg-orange-50 p-8 font-poppins">
      <div className="max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="mb-8 shadow-lg bg-[#073532]">
          <div className="flex border-b border-[#7a2a2f]/30">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 text-center font-medium transition-all duration-200 relative cursor-pointer
                    ${isActive
                      ? "text-[#FFF2E0] font-semibold"
                      : "text-[#fff7ec]/70 hover:text-[#FFF2E0]"}
                  `}
                >
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#FFF2E0] rounded-t-md transition-all"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-[#fff7ec] rounded-lg shadow-lg border border-gray-200 p-8  max-h-[100vh]">
          {activeTab === "about" && <AboutUserTab />}
          {activeTab === "auth" && <AuthenticationTab />}
        </div>
      </div>
    </div>
  );
}
