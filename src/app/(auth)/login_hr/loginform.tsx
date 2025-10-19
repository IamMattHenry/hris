"use client";

import { useState } from "react";
import InputBox from "../components/inputbox";
import PasswordBox from "../components/passwordbox";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        if (data.success) {
          localStorage.setItem("token", data.token);
          alert("Login successful");
          router.refresh();
          /*router.push("/hr/dashboard"); */ //redirect to dashboard, check the route link
        }
        if (!data.success) {
          alert(data.message);
        }
        if (data.message === "Invalid credentials") {
          alert("Invalid credentials");
        }
        if (data.message === "No token provided") {
          alert("No token provided");
        }
        if (data.message === "User not authenticated") {
          alert("User not authenticated");
        }
      });
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
