"use client";

import { useState, useEffect } from "react";
import InputBox from "@/components/auth/inputbox";
import PasswordBox from "@/components/auth/passwordbox";
import { useRouter } from "next/navigation";
import { authApi, ticketApi } from "@/lib/api";
import { toast } from "react-hot-toast";

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
  const [ticketType, setTicketType] = useState<
    "forgot_password" | "contact_support"
  >("contact_support");

  // Auto-clear error message
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  /** ✅ LOGIN HANDLER **/
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const result = await authApi.loginEmployee(username, password);

      if (result.success) {
        localStorage.setItem("token", result.data!.token);
        router.push("/dashboard_employee");
      } else {
        switch (result.message) {
          case "Invalid credentials":
            setErrorMessage("Incorrect username or password.");
            alert("Incorrect username or password.");
            window.location.reload();
            break;
          case "Only employees are allowed to access this portal":
            setErrorMessage(
              "This portal is for employees only. Please use the admin login instead."
            );
            alert(
              "This portal is for employees only. Please use the admin login instead."
            );
            break;
          default:
            setErrorMessage(result.message || "Login failed. Please try again.");
            alert(result.message || "Login failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  /** ✅ SUPPORT / FORGOT PASSWORD TICKET HANDLER **/
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTicketSubmitting) return;
    setIsTicketSubmitting(true);

    try {
      let title: string;
      let description: string;

      if (ticketType === "forgot_password") {
        title = `Forgot Password Request (Employee): ${
          username || "No username provided"
        }`;
        description = `Employee ${
          username || "unknown user"
        } has forgotten their password.\n\n${ticketDescription}`;
      } else {
        title = ticketTitle.trim();
        description = ticketDescription.trim();
      }

      const response = await ticketApi.createPublic({
        title,
        description,
        name: username || undefined,
      });

      if (response.success) {
        toast.success("Your request has been submitted successfully!");
        closeModal();
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

  /** ✅ Reset modal state **/
  const closeModal = () => {
    setShowTicketModal(false);
    setTicketTitle("");
    setTicketDescription("");
  };

  return (
    <>
      {/* LOGIN FORM */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <span className="block text-yellow-500 text-sm font-poppins font-medium text-center transition-opacity duration-500">
            {errorMessage}
          </span>
        )}

        <InputBox
          type="text"
          label="Username"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <PasswordBox
          label="Password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between mb-4 text-[#FFF2E0] text-sm font-poppins">
          <button
            type="button"
            onClick={() => {
              setTicketType("forgot_password");
              setShowTicketModal(true);
            }}
            className="text-[#D4A056] hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#073532] hover:bg-[#0A4844] text-[#FAEFD8] font-poppins font-semibold py-3 mt-4 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>

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

      {/* ✅ MODAL */}
      {showTicketModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md font-poppins animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {ticketType === "forgot_password"
                    ? "Forgot Password Request"
                    : "Contact Support"}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleTicketSubmit}>
                {ticketType === "contact_support" && (
                  <div className="mb-4">
                    <label
                      htmlFor="ticketTitle"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="ticketTitle"
                      value={ticketTitle}
                      onChange={(e) => setTicketTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532]"
                      placeholder="Briefly describe your issue"
                      maxLength={100}
                      required
                    />
                  </div>
                )}

                <div className="mb-6">
                  <label
                    htmlFor="ticketDescription"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {ticketType === "forgot_password"
                      ? "Additional Information"
                      : "Description"}
                  </label>
                  <textarea
                    id="ticketDescription"
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532]"
                    placeholder={
                      ticketType === "forgot_password"
                        ? "Provide any additional information that might help us identify your account give your email or phone number"
                        : "Provide detailed information about your issue"
                    }
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isTicketSubmitting ||
                      (ticketType === "contact_support" && !ticketTitle.trim())
                    }
                    className={`px-4 py-2 text-white rounded-md transition ${
                      isTicketSubmitting ||
                      (ticketType === "contact_support" && !ticketTitle.trim())
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-[#073532] hover:bg-[#0A4844]"
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
