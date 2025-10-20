"use client";
import { useState, useRef, useEffect } from "react";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DaySelectorDropdownProps {
  label?: string;
  selectedDays?: string[];
  onChange?: (selected: string[]) => void;
  error?: string;
}

export default function DaySelectorDropdown({
  label = "Select Days",
  selectedDays: initialSelected = [],
  onChange,
  error,
}: DaySelectorDropdownProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>(initialSelected);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDay = (day: string) => {
    let newSelected = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];

    // Sort according to 'days' order
    newSelected = days.filter(d => newSelected.includes(d));

    setSelectedDays(newSelected);
    onChange?.(newSelected);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col w-64 relative" ref={dropdownRef}>
      {label && <label className="mb-1 text-[#3b2b1c] font-medium">{label}</label>}

      <button
        onClick={() => setOpen(!open)}
        className={`w-full bg-[#fdf4e3] border rounded-lg px-3 py-2 shadow-inner text-left focus:outline-none hover:bg-[#f8eddb] ${
          error ? "border-red-500" : "border-[#e6d2b5]"
        }`}
      >
        {selectedDays.length > 0 ? selectedDays.join(", ") : "Select Days"}
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-[#fdf4e3] border border-[#e6d2b5] rounded-lg shadow-inner max-h-48 overflow-y-auto">
          {days.map(day => (
            <label
              key={day}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#f8eddb]"
            >
              <input
                type="checkbox"
                checked={selectedDays.includes(day)}
                onChange={() => toggleDay(day)}
                className="w-4 h-4"
              />
              <span className="text-[#3b2b1c]">{day}</span>
            </label>
          ))}
        </div>
      )}

      {error && <span className="text-red-500 text-xs mt-1">{error}</span>}
    </div>
  );
}
