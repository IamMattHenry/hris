import React, { useState } from "react";

export default function PasswordBox({
  label,
  value,
  placeholder = "password",
  onChange,
}: {
  label: string;
  value: string;  
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <div>
      <label className="block text-sm text-[#FFF2E0] mb-2 font-poppins">{label}</label>                                  
      <div className="relative mb-4">
        <input
          type={showPassword ? "text" : "password"}
          className="w-full bg-[#FAEFD8] text-gray-800 font-poppins rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4A056]"
          value={value}
          placeholder={placeholder}
          onChange={onChange}
        />
        <span
          className="absolute right-4 top-3 text-gray-600 cursor-pointer material-icons"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? "visibility_off" : "visibility"}
        </span>
      </div>

      <div className="flex items-center justify-between mb-4 text-[#FFF2E0] text-sm font-poppins">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="mr-2 w-4 h-4 rounded border-gray-300 focus:ring-[#D4A056]"
          />
          Remember Me
        </label>

        <a href="#" className="text-[#D4A056] hover:underline">
          Forgot Password?
        </a>
      </div>
    </div>
  );
}
