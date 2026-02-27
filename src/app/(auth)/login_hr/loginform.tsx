"use client";

import { useState, useEffect } from "react";
import InputBox from "@/components/auth/inputbox";
import PasswordBox from "@/components/auth/passwordbox";
import { useRouter } from "next/navigation";
import { authApi, fingerprintApi } from "@/lib/api";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { ticketApi } from "@/lib/api";
import FingerprintAuth2FA from "@/components/auth/FingerprintAuth2FA";

export default function LoginForm() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [isTicketSubmitting, setIsTicketSubmitting] = useState(false);
  const [ticketType, setTicketType] = useState<"forgot_password" | "contact_support">("contact_support");

  // 2FA states
  const [show2FA, setShow2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [fingerprintId, setFingerprintId] = useState<number>(0);
  const [employeeCode, setEmployeeCode] = useState("");

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await authApi.login(username, password);
      console.log("Result:", result);

      if (result.success) {
        // Check if fingerprint 2FA is required
        if ((result as any).requires_fingerprint) {
          // User has fingerprint registered - check if bridge service is available
          const bridgeHealth = await fingerprintApi.checkBridgeHealth();

          if (!bridgeHealth.available) {
            // Bridge service not available - show notification and allow login without 2FA
            console.warn('Fingerprint bridge service not available:', bridgeHealth.error);
            toast.error(
              'Fingerprint service is currently unavailable. Logging in without 2FA verification.',
              { duration: 5000 }
            );

            // Complete login without 2FA (fallback)
            localStorage.setItem("token", (result.data as any).temp_token);
            router.push("/dashboard");
            return;
          }

          // Bridge is available - show 2FA fingerprint prompt
          setTempToken((result.data as any).temp_token);
          setFingerprintId((result.data as any).user.fingerprint_id);
          setEmployeeCode((result.data as any).user.employee_code);
          setShow2FA(true);
        } else {
          // No fingerprint required - complete login
          localStorage.setItem("token", result.data!.token);
          router.push("/dashboard");
        }
      } else {
        if (result.message === "Invalid credentials") {
          setErrorMessage("Incorrect username or password.");
          alert("Incorrect username or password.");
          window.location.href = "/login_hr";
          return;
        } else {
          setErrorMessage(result.message || "Login failed. Please try again.");
          alert(result.message || "Login failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("An unexpected error occurred. Please try again later.");
      alert("An unexpected error occurred. Please try again later.");
    }

    setIsLoading(false);
  };

  const handle2FASuccess = (token: string, user: any) => {
    localStorage.setItem("token", token);
    toast.success("Login successful!");
    router.push("/dashboard");
  };

  const handle2FACancel = () => {
    setShow2FA(false);
    setTempToken("");
    setFingerprintId(0);
    setEmployeeCode("");
  };

  const handle2FASkip = () => {
    // Allow skip but log it
    toast.success("Fingerprint authentication skipped. Logging in...");
    // For now, we'll just cancel - you can implement skip logic if needed
    handle2FACancel();
  };



  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTicketSubmitting(true);

    try {
      let title, description;
      
      if (ticketType === "forgot_password") {
        title = `Forgot Password Request: ${username || "No username provided"}`;
        description = `User ${username || "unknown user"} has forgotten their password.\n\n${ticketDescription}`;
      } else {
        title = ticketTitle;
        description = ticketDescription;
      }

      // Using the public ticket API for unauthenticated users
      const response = await ticketApi.createPublic({
        title,
        description,
        name: username || undefined
      });

      if (response.success) {
        toast.success("Your request has been submitted successfully!");
        setShowTicketModal(false);
        setTicketTitle("");
        setTicketDescription("");
      } else {
        throw new Error(response.message || "Failed to submit request");
      }
    } catch (error: any) {
      console.error("Ticket submission error:", error);
      toast.error(error.message || "Failed to submit request");
    } finally {
      setIsTicketSubmitting(false);
    }
  };

  // Show 2FA component if required
  if (show2FA) {
    return (
      <FingerprintAuth2FA
        tempToken={tempToken}
        expectedFingerprintId={fingerprintId}
        employeeCode={employeeCode}
        onSuccess={handle2FASuccess}
        onCancel={handle2FACancel}
        onSkip={handle2FASkip}
      />
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <span className="block text-yellow-500 text-sm font-poppins font-medium text-center transition-opacity duration-500">
            {errorMessage}
          </span>
        )}

        {/* Username */}
        <InputBox
          type="text"
          label="Username"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        {/* Password */}
        <PasswordBox
          label="Password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex items-center justify-between mb-4 text-[#FFF2E0] text-sm font-poppins">
          <Link href="/password-recovery" className="text-[#D4A056] hover:underline">
            Forgot Password?
          </Link>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#4B0B14] hover:bg-[#60101C] text-[#FAEFD8] font-poppins font-semibold py-3 mt-4 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>

        {/* Support */}
        <p className="text-center text-sm text-gray-300 mt-3 font-poppins">
          Having trouble logging in?{" "}
          <button 
            type="button"
            onClick={() => {
              setTicketType("contact_support");
              setShowTicketModal(true);
            }}
            className="text-[#D4A056] hover:underline"
          >
            Contact Support
          </button>
        </p>
      </form>

      {/* Ticket Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center text-black font-poppins justify-center z-50 p-4">
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {ticketType === "forgot_password" ? "Forgot Password Request" : "Contact Support"}
                </h3>
                <button
                  onClick={() => setShowTicketModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleTicketSubmit}>
                {ticketType === "contact_support" && (
                  <div className="mb-4">
                    <label htmlFor="ticketTitle" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="ticketTitle"
                      value={ticketTitle}
                      onChange={(e) => setTicketTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4B0B14]"
                      placeholder="Briefly describe your issue"
                      maxLength={100}
                      required={ticketType === "contact_support"}
                    />
                  </div>
                )}

                <div className="mb-6">
                  <label htmlFor="ticketDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    {ticketType === "forgot_password" ? "Additional Information" : "Description"}
                  </label>
                  <textarea
                    id="ticketDescription"
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4B0B14]"
                    placeholder={ticketType === "forgot_password" 
                      ? "Provide any additional information that might help us identify your account" 
                      : "Provide detailed information about your issue"}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowTicketModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isTicketSubmitting || (ticketType === "contact_support" && !ticketTitle.trim())}
                    className={`px-4 py-2 text-white rounded-md transition ${
                      isTicketSubmitting 
                        ? "bg-gray-400 cursor-not-allowed" 
                        : (ticketType === "contact_support" && !ticketTitle.trim())
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-[#4B0B14] hover:bg-[#60101C]"
                    }`}
                  >
                    {isTicketSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}