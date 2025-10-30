"use client";
import { Eye } from "lucide-react";


const ActivityLogTab = () => {
  const activities = [
    { id: '109201910', name: 'Juan Dela Cruz', position: 'Assistant', activity: 'Added Employee', date: '10/20/25', time: '5:00 Pm' },
    { id: '109201910', name: 'John Doe', position: 'Manager', activity: 'Logged In', date: '10/20/25', time: '3:00 Pm' },
  ];

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="bg-gray-800 text-white rounded-lg px-6 py-4 grid grid-cols-[100px_200px_1fr_150px_150px_80px] gap-4 items-center">
        <div>Log ID</div>
        <div>Employee</div>
        <div>Activity</div>
        <div>Date</div>
        <div>Time</div>
        <div>View</div>
      </div>

      {/* Table Rows */}
      {activities.map((activity, index) => (
        <div key={index} className="px-6 py-4 grid grid-cols-[100px_200px_1fr_150px_150px_80px] gap-4 items-center border-b border-gray-200">
          <div className="text-gray-700">{activity.id}</div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-900 to-purple-700"></div>
            <div>
              <div className="font-medium text-gray-900">{activity.name}</div>
              <div className="text-sm text-gray-600">{activity.position}</div>
            </div>
          </div>
          <div className="text-gray-700">{activity.activity}</div>
          <div>
            <span className="px-4 py-2 bg-slate-300 text-gray-700 rounded-lg inline-block">
              {activity.date}
            </span>
          </div>
          <div>
            <span className="px-4 py-2 bg-slate-300 text-gray-700 rounded-lg inline-block">
              {activity.time}
            </span>
          </div>
          <div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Eye className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityLogTab;