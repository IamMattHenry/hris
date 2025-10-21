"use client"

import React from "react";

interface InfoBoxProps {
  label: string;
  value?: string;
}

const InfoBox: React.FC<InfoBoxProps> = ({ label, value }) => {
  return (
    <div>
      <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
      <div className="bg-[#fff7ec] px-4 py-2 rounded-xl shadow-inner min-h-[42px]">
        {value || "—"}
      </div>
    </div>
  );
};

export default InfoBox;
