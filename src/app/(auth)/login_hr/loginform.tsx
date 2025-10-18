"use client";

import { useState } from "react";
import InputBox from "../components/inputbox";
import PasswordBox from "../components/passwordbox";

export default function LoginForm() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Logging in with:", employeeId, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      
      {/* Employee ID */}
      <InputBox type="text" label="Employee ID" placeholder="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />

      {/* Password */}
      <PasswordBox label="Password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

      {/* Submit button */}
      <button
        type="submit"
        className="w-full bg-[#4B0B14] hover:bg-[#60101C] text-[#FAEFD8] font-poppins font-semibold py-3 mt-8 rounded-lg transition cursor-pointer"
      >
        Login
      </button>

      {/* Support */}
      <p className="text-center text-sm text-gray-300 mt-3 font-poppins">
        Having trouble logging in?{" "}
        <a href="#" className="text-[#D4A056] hover:underline">
          Contact Support
        </a>
      </p>
    </form>
  );
}
