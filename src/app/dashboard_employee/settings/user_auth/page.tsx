"use client";

import React, { useState } from "react";
import { Save, KeyRound, UserCog } from "lucide-react";
import FormInput from "@/components/forms/FormInput";
import PasswordBox from "@/components/auth/passwordbox";
import ActionButton from "@/components/buttons/ActionButton";

const AuthenticationTab = () => {
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  // ✅ Username Validation
  const handleSaveUsername = () => {
    if (!username.trim()) {
      setErrors({ username: "Username cannot be empty." });
      return;
    }
    setErrors({});
    console.log("✅ Username changed to:", username);
    alert("Username saved successfully!");
  };

  // Password Validation
  const handleSavePassword = () => {
  const newErrors: { password?: string } = {};

  // --- Required fields ---
  if (!newPassword.trim() || !confirmPassword.trim()) {
    newErrors.password = "Both password fields are required.";
  } 
  // --- Matching check ---
  else if (newPassword !== confirmPassword) {
    newErrors.password = "Passwords do not match.";
  } 
  // --- Strength validation ---
  else {
    const password = newPassword;

    if (password.length < 12) {
      newErrors.password = "Password must be at least 12 characters long.";
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = "Password must contain at least 1 uppercase letter.";
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = "Password must contain at least 1 lowercase letter.";
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = "Password must contain at least 1 number.";
    } else if (!/[!@#$%^&*(),.?":{}|<>_\-=+~`]/.test(password)) {
      newErrors.password = "Password must contain at least 1 special character.";
    }
  }

  // --- If any validation errors exist ---
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  // --- Passed all checks ---
  setErrors({});
  console.log("✅ Password changed successfully!");
  alert("Password saved successfully!");
};

  return (
    <div className="max-w-4xl mx-auto text-[#073532]">
      <div className="border border-[#EAD7C4] rounded-2xl p-10 bg-[#FFF2E0]/50 shadow-sm space-y-12">
        {/* Header */}
        <div className="text-left mb-4">
          <h4 className="text-3xl font-bold text-[#073532]">Authentication Settings</h4>
          <p className="text-sm text-[#6b5344] mt-1">
            Manage your login credentials securely.
          </p>
        </div>

        {/* Username Section */}
        <div className="border-t border-[#EAD7C4] pt-8 space-y-5">
          <div className="flex items-center gap-2 mb-4">
            <UserCog className="text-[#073532]" size={20} />
            <h3 className="text-lg font-semibold">Change Username</h3>
          </div>

          <FormInput
            type="text"
            label="New Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
          />

          <div className="flex justify-end">
            <ActionButton
              label="Save Username"
              onClick={handleSaveUsername}
              icon={Save}
              className="bg-[#073532] hover:opacity-90 transition"
            />
          </div>
        </div>

        {/* Password Section */}
        <div className="border-t border-[#EAD7C4] pt-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="text-[#073532]" size={20} />
            <h3 className="text-lg font-semibold">Change Password</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PasswordBox
              label="New Password"
              labelColor="#073532"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={errors.password}
            />
            <PasswordBox
              label="Confirm Password"
              labelColor="#073532"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.password}
            />
          </div>

          <div className="flex justify-end">
            <ActionButton
              label="Save Password"
              onClick={handleSavePassword}
              icon={Save}
              className="bg-[#073532] hover:opacity-90 transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthenticationTab;
