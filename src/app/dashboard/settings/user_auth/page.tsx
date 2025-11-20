"use client";

import React, { useState } from "react";
import { Save, KeyRound, UserCog } from "lucide-react";
import FormInput from "@/components/forms/FormInput";
import PasswordBox from "@/components/auth/passwordbox";
import ActionButton from "@/components/buttons/ActionButton";
import { userApi } from "@/lib/api";

const AuthenticationTab = () => {
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const validatePassword = (password: string) => {
    const requirements = [
      { regex: /.{12,}/, message: "Password must be at least 12 characters long." },
      { regex: /[A-Z]/, message: "Password must contain at least 1 uppercase letter." },
      { regex: /[a-z]/, message: "Password must contain at least 1 lowercase letter." },
      { regex: /[0-9]/, message: "Password must contain at least 1 number." },
      { regex: /[^A-Za-z0-9]/, message: "Password must contain at least 1 special character." }
    ];

    for (const rule of requirements) {
      if (!rule.regex.test(password)) {
        return rule.message;
      }
    }

    return null;
  };


  // ✅ Username Validation and Save
  const handleSaveUsername = async () => {
    if (!username.trim()) {
      setErrors({ username: "Username cannot be empty." });
      return;
    }

    setErrors({});
    setSavingUsername(true);

    try {
      const result = await userApi.updateMe({ username: username.trim() });

      if (result.success) {
        alert("Username updated successfully!");
        setUsername("");
      } else {
        alert(result.message || "Failed to update username");
      }
    } catch (error) {
      console.error("Error updating username:", error);
      alert("An error occurred while updating username");
    } finally {
      setSavingUsername(false);
    }
  };

  // ✅ Password Validation and Save
  const handleSavePassword = async () => {
    const newErrors: { password?: string } = {};

    // Required fields
    if (!newPassword.trim() || !confirmPassword.trim()) {
      newErrors.password = "Both password fields are required.";
    }

    // Password match
    if (!newErrors.password && newPassword !== confirmPassword) {
      newErrors.password = "Passwords do not match.";
    }

    // NEW: Complexity validation
    if (!newErrors.password) {
      const validationMessage = validatePassword(newPassword);
      if (validationMessage) newErrors.password = validationMessage;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Good to proceed
    setErrors({});
    setSavingPassword(true);

    try {
      const result = await userApi.updateMe({ password: newPassword });

      if (result.success) {
        alert("Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        alert(result.message || "Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      alert("An error occurred while updating password");
    } finally {
      setSavingPassword(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto text-[#4B0B14]">
      <div className="border border-[#EAD7C4] rounded-2xl p-10 bg-[#FFF2E0]/50 shadow-sm space-y-12">
        {/* Header */}
        <div className="text-left mb-4">
          <h4 className="text-3xl font-bold text-[#4B0B14]">Authentication Settings</h4>
          <p className="text-sm text-[#6b5344] mt-1">
            Manage your login credentials securely.
          </p>
        </div>

        {/* Username Section */}
        <div className="border-t border-[#EAD7C4] pt-8 space-y-5">
          <div className="flex items-center gap-2 mb-4">
            <UserCog className="text-[#4B0B14]" size={20} />
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
              label={savingUsername ? "Saving..." : "Save Username"}
              onClick={handleSaveUsername}
              icon={savingUsername ? undefined : Save}
              disabled={savingUsername}
              className={`bg-[#4B0B14] hover:opacity-90 transition ${savingUsername ? "opacity-75 cursor-not-allowed" : ""
                }`}
            />
          </div>
        </div>

        {/* Password Section */}
        <div className="border-t border-[#EAD7C4] pt-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="text-[#4B0B14]" size={20} />
            <h3 className="text-lg font-semibold">Change Password</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PasswordBox
              label="New Password"
              labelColor="#4B0B14"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={errors.password}
            />
            <PasswordBox
              label="Confirm Password"
              labelColor="#4B0B14"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.password}
            />
          </div>

          <div className="flex justify-end">
            <ActionButton
              label={savingPassword ? "Saving..." : "Save Password"}
              onClick={handleSavePassword}
              icon={savingPassword ? undefined : Save}
              disabled={savingPassword}
              className={`bg-[#4B0B14] hover:opacity-90 transition ${savingPassword ? "opacity-75 cursor-not-allowed" : ""
                }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthenticationTab;
