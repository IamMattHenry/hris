"use client";

import React from "react";

interface InfoBoxProps {
  label: string;
  value?: string | React.ReactNode;
  isTextarea?: boolean;
  rows?: number;
}

export default function InfoBox({ 
  label, 
  value, 
  isTextarea = false,
  rows = 3 
}: InfoBoxProps) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
      {isTextarea ? (
        <textarea
          value={typeof value === 'string' ? value : ''}
          readOnly
          rows={rows}
          className="w-full bg-[#fff7ec] px-4 py-2 rounded-xl shadow-inner resize-none"
          placeholder="—"
        />
      ) : (
        <div className="bg-[#fff7ec] px-4 py-2 rounded-xl shadow-inner min-h-[42px]">
          {value || "—"}
        </div>
      )}
    </div>
  );
}