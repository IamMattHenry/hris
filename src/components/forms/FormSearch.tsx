"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SearchBar({
  placeholder = "Search...",
  value,
  onChange,
  className = "",
}: SearchBarProps) {
  return (
    <div
      className={`flex items-center bg-[#fff1dd] px-4 py-4 rounded-full shadow-sm w-72 md:w-68 ${className}`}
    >
      <Search className="text-[#3b2b1c] mr-2" size={18} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent focus:outline-none w-full text-sm text-[#3b2b1c] placeholder-[#3b2b1c]/60"
      />
    </div>
  );
}
