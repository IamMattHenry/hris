"use client";

import React from "react";

interface ActionButtonProps<T = any> {
  label: string;
  value?: T; // optional value to pass
  onClick: (value?: T) => void;
  className?: string;
}

export default function ActionButton<T>({ label, value, onClick, className }: ActionButtonProps<T>) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`bg-[#3b2b1c] text-white px-4 py-2 rounded-lg hover:opacity-80 transition ${className || ""}`}
    >
      {label}
    </button>
  );
}
