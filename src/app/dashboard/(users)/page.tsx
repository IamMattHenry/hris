/*

"use client";

import { useState, useEffect } from "react";
import { Search, Trash2, Eye } from "lucide-react";
import { userApi } from "@/lib/api";
import { User } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Check if user is supervisor (view-only access)
  const isSupervisor = currentUser?.role === "supervisor";

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    const result = await userApi.getAll();

    if (result.success && result.data) {
      setUsers(result.data as User[]);
    } else {
      setError(result.message || "Failed to fetch users");
    }

    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user? This will also delete associated employee/admin records.")) {
      return;
    }

    const result = await userApi.delete(id);

    if (result.success) {
      alert("User deleted successfully");
      fetchUsers(); // Refresh the list
    } else {
      alert(result.message || "Failed to delete user");
    }
  };

  const handleView = (id: number) => {
    alert(`View user details for ID: ${id}`);
  };

  // Filter users by search term
  const filtered = users.filter((user) => {
    const username = user.username?.toLowerCase() || '';
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const role = user.role?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();

    return username.includes(search) || fullName.includes(search) || role.includes(search);
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff7ec] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b2b1c] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#fff7ec] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchUsers}
            className="bg-[#3b2b1c] text-white px-6 py-2 rounded-lg hover:opacity-90 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff7ec] p-8 space-y-6 text-gray-800 font-poppins">
      {/* Header *
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-xl font-bold">{users.length} Users</h1>

        <div className="flex items-center bg-[#fff1dd] px-4 py-4 rounded-full shadow-sm w-72">
          <Search className="text-[#3b2b1c] mr-2" size={18} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent focus:outline-none w-full text-sm"
          />
        </div>
      </div>

      {/* Table 
      <div className="w-full">
        <table className="w-full text-sm table-fixed border-separate border-spacing-y-2">
          <thead className="bg-[#3b2b1c] text-white text-left sticky top-0 z-20">
            <tr>
              <th className="py-4 px-4 rounded-l-lg">User ID</th>
              <th className="py-4 px-4">Username</th>
              <th className="py-4 px-4">Name</th>
              <th className="py-4 px-4">Role</th>
              <th className="py-4 px-4">Sub Role</th>
              <th className="py-4 px-4">Employee Code</th>
              <th className="py-4 px-4 rounded-r-lg">Actions</th>
            </tr>
          </thead>
        </table>

        <div className="overflow-y-auto max-h-96">
          <table className="w-full text-sm table-fixed border-separate border-spacing-y-2">
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((user) => (
                  <tr
                    key={user.user_id}
                    className="bg-[#fff4e6] border border-orange-100 rounded-lg hover:shadow-sm transition"
                  >
                    <td className="py-3 px-4">{user.user_id}</td>
                    <td className="py-3 px-4">{user.username}</td>
                    <td className="py-3 px-4">
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {user.sub_role ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          {user.sub_role.toUpperCase()}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {user.employee_code || user.admin_code || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(user.user_id)}
                          className="p-2 rounded hover:bg-gray-200 transition"
                          title="View details"
                        >
                          <Eye size={16} className="text-blue-600" />
                        </button>
                        {!isSupervisor && (
                          <button
                            onClick={() => handleDelete(user.user_id)}
                            className="p-2 rounded hover:bg-red-100 transition"
                            title="Delete user"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

*/