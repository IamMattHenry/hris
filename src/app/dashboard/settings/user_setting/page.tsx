"use client";
import { useState } from "react";
import ProfileSection from "./profile";
import DependantsSection from "./dependant";
import ActionButton from "@/components/buttons/ActionButton";

const AboutUserTab = () => {
    const [activeSection, setActiveSection] = useState('profile');

    return (
        <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-64 rounded-lg p-3 flex flex-col gap-2">
                {[
                    { id: "profile", label: "Profile & Contacts" },
                    { id: "dependants", label: "Dependants" },
                ].map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`w-full cursor-pointer text-left px-4 py-3 rounded-md font-medium transition-all duration-200
                                 ${isActive
                                    ? "bg-[#4B0B14] text-[#FFF2E0] shadow-md"
                                    : "text-[#4B0B14] hover:bg-[#4B0B14]/10"
                                }
                            `}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="flex-1 max-h-screen">
                {activeSection === 'profile' && <ProfileSection />}
                {activeSection === 'dependants' && <DependantsSection />}
            </div>
        </div>
    );
};

export default AboutUserTab;