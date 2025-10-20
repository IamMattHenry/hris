"use client";

import { useState } from "react";
import InputBox from "@/components/auth/inputbox";
import PasswordBox from "@/components/auth/passwordbox";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function LoginForm() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await authApi.login(username, password);

    console.log("Result:", result);

    if (result.success) {
      localStorage.setItem("token", result.data!.token);
      router.push("/dashboard");
    } else {
      alert("Login failed. Please check your username and password.");
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      
      {/* username */}
      <InputBox type="text" label="Username" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />

      {/* Password */}
      <PasswordBox label="Password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#4B0B14] hover:bg-[#60101C] text-[#FAEFD8] font-poppins font-semibold py-3 mt-8 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Logging in..." : "Login"}
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
