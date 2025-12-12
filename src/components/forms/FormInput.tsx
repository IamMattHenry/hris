import React, { useEffect } from "react";
import toast from "react-hot-toast";

interface FormInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  max?: string; // optional max date
  readOnly?: boolean; 
  disabled?: boolean;
}

export default function FormInput({
  label,
  type,
  value,
  onChange,
  placeholder,
  error,
  max,
  readOnly = false, // default false
  disabled = false,
}: FormInputProps) {
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <div className="flex flex-col">
      <label className="block text-[#3b2b1c] mb-1 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly} 
        disabled={disabled}
        max={max} // optional max date
        className={`w-full bg-[#fdf4e3] border ${
          error ? "border-red-400" : "border-[#e6d2b5]"
        } rounded-lg px-3 py-2 shadow-inner focus:outline-none ${
          readOnly || disabled ? "bg-gray-200 cursor-not-allowed text-gray-600" : ""
        }`}
      />
      {error && <span className="text-red-500 text-xs mt-1">{error}</span>}
    </div>
  );
}
