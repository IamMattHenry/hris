"use client";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const currentPage =
    pathname.split("/").filter(Boolean).pop() || "dashboard";

  const titleHeader =
    currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

  // Get user display name and type
  const adminName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username || "User";

  const adminType = user?.sub_role
    ? user.sub_role.toUpperCase()
    : user?.role?.toUpperCase() || "USER";

  // Show loading state while fetching user
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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header titleHeader={titleHeader} adminName={adminName} adminType={adminType} />
        <main className="p-6 bg-[#FDF6EC]">{children}</main>
      </div>
    </div>
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
