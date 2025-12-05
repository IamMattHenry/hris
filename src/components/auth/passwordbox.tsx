import React, { useState } from "react";

export default function PasswordBox({
  label,
  value,
  placeholder = "password",
  onChange,
  error = "",
  labelColor = "#FFF2E0", 
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  labelColor?: string; // ✅ optional label color
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mb-4">
      {/* Label */}
      <label
        className="block text-sm mb-2 font-medium font-poppins"
        style={{ color: labelColor }}
      >
        {label}
      </label>

      {/* Input Field */}
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          className={`w-full bg-[#FAEFD8] text-gray-800 rounded-full px-4 py-3 focus:outline-none focus:ring-2 font-poppins ${
            error
              ? "border border-red-500 focus:ring-red-400"
              : "border border-[#E6D2B5] focus:ring-[#D4A056]"
          }`}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          required
        />

        {/* Toggle Password Visibility */}
        <span
          className="absolute right-4 top-3 text-gray-600 cursor-pointer material-icons"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? "visibility_off" : "visibility"}
        </span>
      </div>

      {/* Error Message */}
      {error && <p className="text-red-600 text-xs mt-1 font-poppins">{error}</p>}
    </div>
  );
}
