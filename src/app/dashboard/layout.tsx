"use client";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const currentPage =
    pathname.split("/").filter(Boolean).pop() || "dashboard";

  const titleHeader =
    currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header titleHeader={titleHeader} adminName="Christian Ancog" adminType="HR manager" />
        <main className="p-6 bg-[#FDF6EC]">{children}</main>
      </div>
    </div>
  );
}
