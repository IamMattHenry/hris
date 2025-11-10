"use client";
import { useState, useEffect } from "react";
import AuthenticationTab from "./user_auth/page";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user !== undefined) setIsLoading(false);
  }, [user]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#4B0B14] font-semibold">
        Loading settings...
      </div>
    );
  }

  // Handle logged-out state
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

  return (
    <div className="min-h-screen bg-orange-50 p-8 font-poppins">
      <div className="max-w-7xl mx-auto">
        {/* Single Tab Header */}
        <div className="mb-8 shadow-lg bg-[#073532]">
          <div className="flex border-b border-[#7a2a2f]/30">
            <div className="flex-1 px-6 py-4 text-center font-semibold text-[#FFF2E0] relative">
              Authentication
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#FFF2E0] rounded-t-md"></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#fff7ec] rounded-lg shadow-lg border border-gray-300 p-8 max-h-[100vh]">
          <AuthenticationTab />
        </div>
      </div>
    </div>
  );
}