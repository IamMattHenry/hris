"use client";

import React from "react";
import { LucideIcon } from "lucide-react"; 

interface ActionButtonProps<T = any> {
  label: string;
  value?: T;
  onClick: (value?: T) => void;
  className?: string;
  icon?: LucideIcon; 
  iconPosition?: "left" | "right"; 
}

export default function ActionButton<T>({
  label,
  value,
  onClick,
  className = "",
  icon: Icon,
  iconPosition = "left",
}: ActionButtonProps<T>) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`flex items-center justify-center bg-[#3b2b1c] cursor-pointer text-white px-6 py-3 rounded-full shadow-md hover:opacity-90 transition ${className}`}
    >
      {Icon && iconPosition === "left" && <Icon size={18} className="mr-2"  />}
      {label}
      {Icon && iconPosition === "right" && <Icon size={18} className="ml-2" />}
    </button>
  );
}
