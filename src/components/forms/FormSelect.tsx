"use client";

import React from "react";

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[]; // e.g. ["Male", "Female"]
  error?: string;
}

export default function FormSelect({
  label,
  value,
  onChange,
  options,
  error,
}: FormSelectProps) {
  return (
    <div className="flex flex-col">
      <label className="block text-[#3b2b1c] mb-1 font-medium">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className={`w-full bg-[#fdf4e3] border ${
          error ? "border-red-500" : "border-[#e6d2b5]"
        } rounded-lg px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#d4a056]`}
      >
        <option value="">-- Select {label} --</option>
        {options.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <span className="text-red-500 text-xs mt-1">{error}</span>}
    </div>
  );
}
