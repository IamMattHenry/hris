"use client";

import React from "react";

interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<string | SelectOption>;
  error?: string;
  placeholder?: string; // optional custom placeholder
}

export default function FormSelect({
  label,
  value,
  onChange,
  options,
  error,
  placeholder,
}: FormSelectProps) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="block text-[#3b2b1c] mb-1 font-medium">
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={onChange}
        className={`w-full bg-[#fdf4e3] border rounded-lg px-3 py-2 shadow-inner 
          focus:outline-none focus:ring-2 focus:ring-[#d4a056]
          ${error ? "border-red-500" : "border-[#e6d2b5]"}`}
      >
        <option value="" disabled>
          {placeholder ?? `-- Select ${label} --`}
        </option>

        {options.map((opt, index) => {
          const isObject = typeof opt === "object";

          return (
            <option key={index} value={isObject ? opt.value : opt}>
              {isObject ? opt.label : opt}
            </option>
          );
        })}
      </select>

      {error && <span className="text-red-500 text-xs mt-1">{error}</span>}
    </div>
  );
}
