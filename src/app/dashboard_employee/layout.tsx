"use client";
import { usePathname } from "next/navigation";
//import Head from "next/head";
import NavBar from "@/components/dashboard_employee/NavBar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const currentPage =
    pathname.split("/").filter(Boolean).pop() || "dashboard";

  const titleHeader = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

  const adminName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username || "User";

  // Format role display: Show role (and sub_role if exists)
  const formatRole = (role?: string) => {
    if (!role) return "USER";
    if (role === "superadmin") return "SUPERADMIN";
    if (role === "admin") return "ADMIN";
    if (role === "supervisor") return "SUPERVISOR";
    if (role === "employee") return "EMPLOYEE";
    return role.toUpperCase();
  };

  const formatSubRole = (subRole?: string) => {
    if (!subRole) return "";
    if (subRole === "hr") return "HR";
    if (subRole === "it") return "IT";
    if (subRole === "front_desk") return "Front Desk";
    return subRole.toUpperCase();
  };

  // Display department name for admin/supervisor, sub_role for others
  const getRoleDisplay = () => {
    if (!user?.role) return "USER";

    const roleLabel = formatRole(user.role);

    // For admin and supervisor, show department name
    if ((user.role === "admin" || user.role === "supervisor") && user.department_name) {
      return `${roleLabel} - ${user.department_name}`;
    }

    // For superadmin, just show role
    if (user.role === "superadmin") {
      return roleLabel;
    }

    // For others with sub_role, show formatted sub_role
    if (user.sub_role) {
      return `${roleLabel} - ${formatSubRole(user.sub_role)}`;
    }

    return roleLabel;
  };

  const adminType = getRoleDisplay();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDF6EC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4B0B14] mx-auto"></div>
          <p className="mt-4 text-[#3C1E1E] font-poppins">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <main className="flex-1 p-6 bg-[#FDF6EC]">{children}</main>
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
}
