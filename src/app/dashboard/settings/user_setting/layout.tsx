"use client";
import { useState } from "react";
import ProfileSection from "./profile";
import DependantsSection from "./dependant";


const AboutUserTab = () => {
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-64 space-y-2">
        <button
          onClick={() => setActiveSection('profile')}
          className={`w-full px-4 py-3 text-left rounded-lg transition-colors ${
            activeSection === 'profile' 
              ? 'bg-slate-300 text-gray-900' 
              : 'text-gray-700 hover:bg-slate-200'
          }`}
        >
          Profile & Contacts
        </button>
        <button
          onClick={() => setActiveSection('dependants')}
          className={`w-full px-4 py-3 text-left rounded-lg transition-colors ${
            activeSection === 'dependants' 
              ? 'bg-slate-300 text-gray-900' 
              : 'text-gray-700 hover:bg-slate-200'
          }`}
        >
          Dependants
        </button>
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeSection === 'profile' && <ProfileSection />}
        {activeSection === 'dependants' && <DependantsSection />}
      </div>
    </div>
  );
};

export default AboutUserTab;