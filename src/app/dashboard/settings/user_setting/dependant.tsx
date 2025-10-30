"use client";

const DependantsSection = () => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold mb-6">Emergency Contacts</h3>
    
    {/* Emergency Contact 1 */}
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-gray-600 mb-2">Emergency Contact (1)</label>
          <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-gray-600 mb-2">Relation</label>
          <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-gray-600 mb-2">Number</label>
          <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-600 mb-2">Email</label>
          <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-gray-600 mb-2">Address</label>
          <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
    </div>

    {/* Emergency Contact 2 */}
    <div className="space-y-4 pt-6">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-gray-600 mb-2">Emergency Contact (2)</label>
          <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-gray-600 mb-2">Relation</label>
          <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-gray-600 mb-2">Number</label>
          <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-600 mb-2">Email</label>
          <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-gray-600 mb-2">Address</label>
          <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

export default DependantsSection;