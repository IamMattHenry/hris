"use client";
import { useState } from "react";
import { X } from "lucide-react";
import AboutUserTab from "./user_setting/layout";
import ActivityLogTab from "./user_activity_log/layout";
import TechnicalSupportTab from "./user_support/layout";
import AuthenticationTab from "./user_auth/layout";




export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('about');

  const tabs = [
    { id: 'about', label: 'About User' },
    { id: 'activity', label: 'Activity Log' },
    { id: 'support', label: 'Technical Support' },
    { id: 'auth', label: 'Authentication' },
  ];

  return (
    <div className="min-h-screen bg-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>
          <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {activeTab === 'about' && <AboutUserTab />}
          {activeTab === 'activity' && <ActivityLogTab />}
          {activeTab === 'support' && <TechnicalSupportTab />}
          {activeTab === 'auth' && <AuthenticationTab />}
        </div>
      </div>
    </div>
  );
}