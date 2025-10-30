"use client";

const AuthenticationTab = () => {
  return (
    <div className="max-w-4xl">
      <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-8">
        <h2 className="text-2xl font-semibold text-gray-900">Change Authentication</h2>
        
        {/* Username Section */}
        <div className="space-y-4">
          <label className="block text-gray-700 font-medium">UserName</label>
          <input 
            type="text" 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" 
          />
          <div className="flex justify-end">
            <button className="px-6 py-2 bg-slate-300 text-gray-700 rounded-lg hover:bg-slate-400 transition-colors">
              Change Username
            </button>
          </div>
        </div>

        {/* Password Section */}
        <div className="space-y-4">
          <label className="block text-gray-700 font-medium">Password</label>
          <input 
            type="password" 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" 
          />
          <div className="flex justify-end">
            <button className="px-6 py-2 bg-slate-300 text-gray-700 rounded-lg hover:bg-slate-400 transition-colors">
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthenticationTab;