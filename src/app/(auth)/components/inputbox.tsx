import React from "react";

export default function InputBox({
  label,
  type = "text",
  value,
  placeholder = "text",  
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-[#FFF2E0] mb-2 font-poppins">{label}</label>
      <input
        type={type}
        className="w-full bg-[#FAEFD8] text-gray-800 font-poppins rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4A056]"
        value={value}
        placeholder={`Enter your ${placeholder}`}
        onChange={onChange}
      />
    </div>
  );
}
