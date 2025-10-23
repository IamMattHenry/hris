"use client";

import { useState } from "react";
import { Plus, MoreVertical } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";

type TabKey = "Leave Request" | "Benefit Request" | "Other Requests" | "History";

const tabs: TabKey[] = ["Leave Request", "Benefit Request", "Other Requests", "History"];

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("Leave Request");
  const [searchRequest, setSearchRequest] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  // sample data 
  const data: Record<TabKey, { id: string; name: string; position: string; email: string; status: string }[]> = {
    "Leave Request": [
      { id: "001", name: "King, Oliver J.", position: "Manager", email: "HR", status: "Active" },
      { id: "002", name: "Montgomery, Sophie L.", position: "Waiter", email: "HR", status: "On Leave" },
    ],
    "Benefit Request": [
      { id: "101", name: "Anderson, Maria", position: "HR", email: "HR", status: "Approved" },
      { id: "102", name: "Lee, Marcus", position: "Cashier", email: "Finance", status: "Pending" },
    ],
    "Other Requests": [
      { id: "201", name: "Garcia, Paul", position: "Waiter", email: "Admin", status: "Pending" },
    ],
    "History": [
      { id: "301", name: "Brown, Sarah", position: "Manager", email: "HR", status: "Completed" },
      { id: "302", name: "Taylor, John", position: "Chef", email: "HR", status: "Completed" },
    ],
  };

  const handleAddRequest = (isOpen: boolean) => {
    setIsModalOpen(isOpen);
  }

  return (
    <div className="min-h-screen bg-[#fff7ec] p-6 text-[#3b2b1c] font-poppins">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-extrabold">Requests</h1>

        <div className="flex gap-2">
          {/* Search */}
          <SearchBar placeholder="Search Request" onChange={setSearchRequest} value={searchRequest}/>

          {/* Add Button */}
          <ActionButton label="Add Request" onClick={() => setIsModalOpen(true)} icon={Plus} />
        </div> 
      </div>

      {/* Tabs */}
      <div className="rounded-2xl overflow-hidden shadow-md bg-[#fff7ec]">
        <div className="flex border-b border-[#d5b9a1] bg-[#fff7ec]">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-6 py-3 text-md cursor-pointer transition-all ${
                activeTab === tab
                  ? "text-[#6d2b24] border-b-4 border-[#6d2b24]"
                  : "text-[#7a5c4a] hover:text-[#6d2b24]/80"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm  text-md">
            <thead>
              <tr className="bg-[#3b2b1c] text-white">
                <th className="py-2 px-4 text-left">ID</th>
                <th className="py-2 px-4 text-left">Name</th>
                <th className="py-2 px-4 text-left">Position</th>
                <th className="py-2 px-4 text-left">Email</th>
                <th className="py-2 px-4 text-left">Request Date</th>
                <th className="py-2 px-4 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {data[activeTab].map((req) => (
                <tr
                  key={req.id}
                  className="border-b border-[#eadfcd] hover:bg-[#fdf4e7] transition"
                >
                  <td className="py-3 px-4">{req.id}</td>
                  <td className="py-3 px-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#e5d1b8]" />
                    {req.name}
                  </td>
                  <td className="py-3 px-4">{req.position}</td>
                  <td className="py-3 px-4">{req.email}</td>
                  <td className="py-3 px-4">{req.status}</td>
                  <td className="py-3 px-4 text-center">
                    <MoreVertical size={18} className="text-[#3b2b1c]/70 cursor-pointer" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {data[activeTab].length === 0 && (
            <div className="text-center py-6 text-[#7a5c4a]/70">
              No {activeTab.toLowerCase()} found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
