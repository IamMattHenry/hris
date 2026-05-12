"use client";

import React, { useState, useEffect } from "react";
import { Save, KeyRound, UserCog } from "lucide-react";
import FormInput from "@/components/forms/FormInput";
import PasswordBox from "@/components/auth/passwordbox";
import ActionButton from "@/components/buttons/ActionButton";
import { userApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

const AuthenticationTab = () => {
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.employee_id) return;
      setUsername(user.username || "");
    };
    fetchData();
  }, [user]);

  const handleSaveUsername = () => {
    const trimmed = username.trim();

    if (!trimmed) {
      setErrors({ username: "Username cannot be empty." });
      return;
    }

    if (trimmed.length < 5) {
      setErrors({ username: "Username must be at least 5 characters long." });
      return;
    }

    setErrors({});
    setSavingUsername(true);
    
    userApi
      .updateMe({ username: trimmed })
      .then((result) => {
        if (result.success) {
          toast.success("Username updated successfully!");
          setUsername(trimmed);
        } else {
          toast.error(result.message || "Failed to update username");
        }
      })
      .catch((error) => {
        console.error("Error updating username:", error);
        toast.error("An error occurred while updating username");
      })
      .finally(() => {
        setSavingUsername(false);
      });
  };

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
    setSavingPassword(true);

    userApi
      .updateMe({ password: newPassword })
      .then((result) => {
        if (result.success) {
          toast.success("Password updated successfully!");
          setNewPassword("");
          setConfirmPassword("");
        } else {
          toast.error(result.message || "Failed to update password");
        }
      })
      .catch((error) => {
        console.error("Error updating password:", error);
        toast.error("An error occurred while updating password");
      })
      .finally(() => {
        setSavingPassword(false);
      });
  };

  return (
    <div className="max-w-4xl mx-auto font-poppins space-y-8 pb-10">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Authentication Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your login credentials and account security.
        </p>
      </div>

      {/* Username Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <div className="p-2 bg-[#073532]/10 rounded-lg shrink-0">
            <UserCog className="text-[#073532]" size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Change Username</h3>
            <p className="text-xs text-gray-500 mt-0.5">Update the username you use to log into your account.</p>
          </div>
        </div>
        
        <div className="p-6 text-gray-500">
          <div className="max-w-md">
            <FormInput
              type="text"
              label="New Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={errors.username}
              placeholder="Enter new username"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <ActionButton
            label={savingUsername ? "Saving..." : "Save Username"}
            onClick={handleSaveUsername}
            icon={savingUsername ? undefined : Save}
            disabled={savingUsername || !username.trim()}
            className="bg-[#073532] text-white hover:bg-[#0a4a4a] transition disabled:opacity-50 shadow-sm"
          />
        </div>
      </div>

      {/* Password Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <div className="p-2 bg-[#073532]/10 rounded-lg shrink-0">
            <KeyRound className="text-[#073532]" size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
            <p className="text-xs text-gray-500 mt-0.5">Ensure your account is using a long, random password to stay secure.</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-[#6b7280]">
            <div>
              <PasswordBox
                label="New Password"
                labelColor="#6b7280"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={errors.password}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <PasswordBox
                label="Confirm Password"
                labelColor="#6b7280"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.password}
                placeholder="Confirm new password"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <ActionButton
            label={savingPassword ? "Updating..." : "Update Password"}
            onClick={handleSavePassword}
            icon={savingPassword ? undefined : Save}
            disabled={savingPassword || !newPassword.trim() || !confirmPassword.trim()}
            className="bg-[#073532] text-white hover:bg-[#0a4a4a] transition disabled:opacity-50 shadow-sm"
          />
        </div>
      </div>

    </div>
  );
};

export default AuthenticationTab;