"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import InputBox from "@/components/auth/inputbox";
import PasswordBox from "@/components/auth/passwordbox";
import { passwordRecoveryApi } from "@/lib/api";

const STEPS = {
  request: "request" as const,
  verify: "verify" as const,
  reset: "reset" as const,
  success: "success" as const,
};

export default function PasswordRecoveryPage() {
  const [step, setStep] = useState<(typeof STEPS)[keyof typeof STEPS]>(STEPS.request);
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedIdentifier = identifier.trim();

  const requestOtp = async () => {
    if (!trimmedIdentifier) {
      toast.error("Please enter your username or email.");
      return false;
    }

    setIsSubmitting(true);
    try {
      await passwordRecoveryApi.requestOtp(trimmedIdentifier);
      toast.success("If the account exists, we've sent an OTP to the associated email.");
      return true;
    } catch (error) {
      console.error("requestOtp error", error);
      toast.error("Something went wrong while requesting the OTP. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await requestOtp();
    if (success) {
      setStep(STEPS.verify);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedCode = otpCode.trim();
    if (!trimmedCode) {
      toast.error("Please enter the OTP code you received.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await passwordRecoveryApi.verifyOtp(trimmedIdentifier, trimmedCode);
      if (!response.success) {
        toast.error(response.message || "Invalid OTP. Please try again.");
        return;
      }

      const token = response.data?.reset_token;
      if (!token) {
        toast.error("Reset token was not returned. Please request a new OTP.");
        return;
      }

      toast.success("OTP verified! You can now set a new password.");
      setResetToken(token);
      setStep(STEPS.reset);
    } catch (error) {
      console.error("verifyOtp error", error);
      toast.error("Failed to verify OTP. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetToken) {
      toast.error("Reset token missing. Please restart the recovery process.");
      setStep(STEPS.request);
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error("Please fill in both password fields.");
      return;
    }

    if (newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await passwordRecoveryApi.resetPassword(resetToken, newPassword.trim());
      if (!response.success) {
        toast.error(response.message || "Failed to reset password.");
        return;
      }

      toast.success("Password updated successfully!");
      setStep(STEPS.success);
    } catch (error) {
      console.error("resetPassword error", error);
      toast.error("Failed to reset password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRequestStep = () => (
    <form onSubmit={handleRequestOtp} className="space-y-6">
      <InputBox
        label="Username or Email"
        placeholder="username or email"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#4B0B14] hover:bg-[#60101C] text-[#FAEFD8] font-poppins font-semibold py-3 rounded-lg transition disabled:opacity-60"
      >
        {isSubmitting ? "Sending OTP..." : "Send OTP"}
      </button>
    </form>
  );

  const renderVerifyStep = () => (
    <form onSubmit={handleVerifyOtp} className="space-y-6">
      <p className="text-sm text-[#FDEBD0] font-poppins">
        We've sent a one-time code to the email on record (if the account exists). Enter it below to continue.
      </p>

      <InputBox
        label="OTP Code"
        type="text"
        placeholder="6-digit code"
        value={otpCode}
        onChange={(e) => setOtpCode(e.target.value)}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-[#4B0B14] hover:bg-[#60101C] text-[#FAEFD8] font-poppins font-semibold py-3 rounded-lg transition disabled:opacity-60"
        >
          {isSubmitting ? "Verifying..." : "Verify Code"}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (isSubmitting) return;
            const success = await requestOtp();
            if (success) {
              setOtpCode("");
            }
          }}
          disabled={isSubmitting}
          className="flex-1 bg-[#D4A056] hover:bg-[#C28A3F] text-[#3B1C11] font-poppins font-semibold py-3 rounded-lg transition disabled:opacity-60"
        >
          Resend OTP
        </button>
      </div>
    </form>
  );

  const renderResetStep = () => (
    <form onSubmit={handleResetPassword} className="space-y-6">
      <PasswordBox
        label="New Password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Enter new password"
        labelColor="#FDEBD0"
      />

      <PasswordBox
        label="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Re-enter new password"
        labelColor="#FDEBD0"
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#4B0B14] hover:bg-[#60101C] text-[#FAEFD8] font-poppins font-semibold py-3 rounded-lg transition disabled:opacity-60"
      >
        {isSubmitting ? "Updating..." : "Update Password"}
      </button>
    </form>
  );

  const renderSuccessStep = () => (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-semibold text-[#FDEBD0]">Password Updated</h2>
      <p className="text-sm text-[#FDEBD0]/80 font-poppins">
        You can now log in with your new password.
      </p>
      <Link
        href="/"
        className="inline-block bg-[#4B0B14] hover:bg-[#60101C] text-[#FAEFD8] font-poppins font-semibold px-6 py-3 rounded-lg transition"
      >
        Return to Portal Selection
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#073532] px-4">
      <div className="bg-white/10 backdrop-blur-sm p-10 rounded-2xl border border-white/20 shadow-2xl w-full max-w-lg text-white space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-poppins">Password Recovery</h1>
          <p className="text-sm text-[#FDEBD0]/80 font-poppins">
            Follow the steps to recover access to your account.
          </p>
        </div>

        {step === STEPS.request && renderRequestStep()}
        {step === STEPS.verify && renderVerifyStep()}
        {step === STEPS.reset && renderResetStep()}
        {step === STEPS.success && renderSuccessStep()}

        <div className="text-center text-sm text-[#FDEBD0]/70 font-poppins space-y-2">
          <p>
            Need help? <Link href="/" className="underline hover:text-[#FDEBD0]">Return to the portal selection</Link>
          </p>
          {step !== STEPS.success && (
            <p>
              Remembered your password? {" "}
              <Link href="/" className="underline hover:text-[#FDEBD0]">Head back to login</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
