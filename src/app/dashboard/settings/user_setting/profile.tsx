"use client";

const ProfileSection = () => (
  <div className="space-y-6">
    {/* Profile Header */}
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-6">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-900 to-purple-700 flex items-center justify-center text-white text-4xl font-bold">
          AN
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Admin Name</h2>
          <p className="text-gray-600">EMP-002</p>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Status:</span>
            <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm">
              Active
            </span>
          </div>
        </div>
      </div>
      <div className="text-right space-y-2 text-gray-700">
        <p>Job Title: Manager</p>
        <p>Department: Human Resource</p>
        <p>Shift: Morning</p>
      </div>
    </div>

    {/* Form Fields */}
    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
      <div>
        <label className="block text-gray-600 mb-2">Gender</label>
        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-gray-600 mb-2">Email (1)</label>
        <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-gray-600 mb-2">Email (2)</label>
        <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-gray-600 mb-2">Civil Status</label>
        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-gray-600 mb-2">Contact (1)</label>
        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-gray-600 mb-2">Contact (2)</label>
        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>
      <div className="col-span-2">
        <label className="block text-gray-600 mb-2">Home Address</label>
        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>
      <div></div>
      <div>
        <label className="block text-gray-600 mb-2">Home Region</label>
        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-gray-600 mb-2">Home City</label>
        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>
    </div>
  </div>
);

export default ProfileSection;