"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CheckCircle, Mail, Briefcase, Building, LogsIcon, Headset, DollarSign, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

export default function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();
    const { canAny, loading: permissionsLoading } = usePermissions();

    const links = [
        { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard", show: true },
        {
            name: "Employees",
            icon: Users,
            path: "/dashboard/employees",
            show: canAny('employees.read', 'employees.read_own', 'employees.create', 'employees.update'),
        },
        {
            name: "Attendance",
            icon: CheckCircle,
            path: "/dashboard/attendance",
            show: canAny('attendance.read', 'attendance.read_own', 'attendance.update', 'attendance.create'),
        },
        {
            name: "Requests",
            icon: Mail,
            path: "/dashboard/requests",
            show: canAny('leave.read', 'leave.read_own', 'leave.read_department', 'leave.manage_status'),
        },
        {
            name: "Positions",
            icon: Briefcase,
            path: "/dashboard/positions",
            show: canAny('positions.read', 'positions.create', 'positions.update', 'positions.delete'),
        },
        {
            name: "Departments",
            icon: Building,
            path: "/dashboard/departments",
            show: canAny('departments.read', 'departments.create', 'departments.update', 'departments.delete'),
        },
        {
            name: "Payroll",
            icon: DollarSign,
            path: "/dashboard/payroll",
            show: canAny('payroll.read', 'payroll.create', 'payroll.update', 'payroll.finalize', 'payroll.override'),
        },
        {
            name: "Penalty",
            icon: AlertTriangle,
            path: "/dashboard/penalty",
            show: canAny('penalties.read', 'penalties.create', 'penalties.update', 'penalties.approve', 'penalties.settle', 'penalties.cancel', 'penalties.delete'),
        },
    ].filter((link) => link.show || permissionsLoading);

    if (user?.role === "superadmin" || user?.role === "admin") {
        links.push({ name: "Activity Log", icon: LogsIcon, path: "/dashboard/activity_log", show: true });
        links.push({ name: "Contact Support", icon: Headset, path: "/dashboard/contact_support", show: true });
    }

    return (
        <aside className="w-96 min-w-[400px] bg-[linear-gradient(180deg,#190006_23%,#480C1B_67%,#300611_100%)] text-[#FFF2E0] font-poppins p-4 min-h-screen shadow-xl flex flex-col">
            <div className="mb-8 flex items-center justify-center shrink-0">
                <Image
                    src="/logo/celestia-hr-logo.png"
                    alt="Logo"
                    width={250}
                    height={250}
                    className="object-contain"
                    priority
                />
            </div>
            <ul className="space-y-4 flex-1">
                {links.map(({ name, icon: Icon, path }) => (
                    <li key={name}>
                        <Link
                            href={path}
                            className={`flex items-center space-x-2 p-3 py-4 rounded-xl ${pathname === path
                                ? "bg-[#5B1924] text-white"
                                : "hover:bg-[#530C1F]"
                                }`}
                        >
                            <Icon className="w-5 h-5 me-4" />
                            <span>{name}</span>
                        </Link>
                    </li>
                ))}
            </ul>
            <div className="mt-auto pt-8 text-xs text-yellow-800 opacity-60 flex items-center shrink-0">
                <Image src="/logo/logo_outline.png" alt="Celestia Logo" width={48} height={48} />
                <span className="ml-1 text-lg">© Celestia Hotel {new Date().getFullYear()}</span>
            </div>
        </aside>
    );
}
