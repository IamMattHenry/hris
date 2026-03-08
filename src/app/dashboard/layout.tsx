"use client";
import { usePathname } from "next/navigation";
import Head from "next/head";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  let currentPage =
    pathname.split("/").filter(Boolean).pop() || "dashboard";

if (currentPage === "tech_support") {
  currentPage = "Technical Support";
} else if (currentPage === "activity_log") {
  currentPage = "Activity Log";
} else {
  currentPage = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);
}


  const titleHeader = currentPage;

  const adminName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username || "User";

  // Format role display
  const formatRole = (role?: string) => {
    if (!role) return "USER";
    if (role === "superadmin") return "SUPERADMIN";
    if (role === "admin") return "ADMIN";
    if (role === "supervisor") return "SUPERVISOR";
    if (role === "employee") return "EMPLOYEE";
    return role.toUpperCase();
  };

  // Display department name for admin/supervisor
  const getRoleDisplay = () => {
    if (!user) return "USER";

    if (user.position_name) {
      if (user.department_name) {
        return `${user.position_name} - ${user.department_name}`;
      }
      return user.position_name;
    }

    const roleLabel = formatRole(user.role);

    // For admin and supervisor, show department name
    if ((user.role === "admin" || user.role === "supervisor") && user.department_name) {
      return `${roleLabel} - ${user.department_name}`;
    }

    // For superadmin, just show role
    if (user.role === "superadmin") {
      return roleLabel;
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
    <ErrorBoundary>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header titleHeader={titleHeader} adminName={adminName} adminType={adminType} />
          <main className="p-6 bg-[#FDF6EC]">{children}</main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider
      allowedRoles={['admin', 'supervisor', 'superadmin']}
      allowedRbacRoles={[
        'hr_manager',
        'hr_supervisor',
        'leave_attendance_officer',
        'recruitment_officer',
      ]}
      redirectTo="/login_hr"
      unauthorizedRedirectTo="/"
    >
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
}