"use client";
import { Eye } from "lucide-react";

const TechnicalSupportTab = () => {
  const tickets = [
    { id: '109201910', name: 'Juan Dela Cruz', position: 'Position', email: 'Juan@Gmail.Com', concern: 'Forgot Password', date: '10/20/25', status: 'Resolved' },
    { id: '109201910', name: 'Juan Dela Cruz', position: 'Position', email: 'Juan@Gmail.Com', concern: 'Exporting Report', date: '10/20/25', status: 'Pending' },
  ];

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="bg-gray-800 text-white rounded-lg px-6 py-4 grid grid-cols-[100px_200px_200px_1fr_150px_120px_80px] gap-4 items-center">
        <div>Ticket ID</div>
        <div>Employee</div>
        <div>Email</div>
        <div>Concern</div>
        <div>Date</div>
        <div>Status</div>
        <div>View</div>
      </div>

      {/* Table Rows */}
      {tickets.map((ticket, index) => (
        <div key={index} className="px-6 py-4 grid grid-cols-[100px_200px_200px_1fr_150px_120px_80px] gap-4 items-center border-b border-gray-200">
          <div className="text-gray-700">{ticket.id}</div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-900 to-purple-700"></div>
            <div>
              <div className="font-medium text-gray-900">{ticket.name}</div>
              <div className="text-sm text-gray-600">{ticket.position}</div>
            </div>
          </div>
          <div className="text-gray-700">{ticket.email}</div>
          <div className="text-gray-700">{ticket.concern}</div>
          <div>
            <span className="px-4 py-2 bg-slate-300 text-gray-700 rounded-lg inline-block">
              {ticket.date}
            </span>
          </div>
          <div>
            <span className={`px-4 py-2 rounded-lg inline-block ${
              ticket.status === 'Resolved' 
                ? 'bg-green-200 text-green-800' 
                : 'bg-gray-300 text-gray-700'
            }`}>
              {ticket.status}
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

export default TechnicalSupportTab;