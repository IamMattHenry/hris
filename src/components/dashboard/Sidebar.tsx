"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CheckCircle, FileText, Mail, Briefcase } from "lucide-react";
import Image from "next/image";

export default function Sidebar() {
    const pathname = usePathname();

    const links = [
        { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { name: "Employees", icon: Users, path: "/dashboard/employees" },
        { name: "Attendance", icon: CheckCircle, path: "/dashboard/attendance" },
        { name: "Payroll", icon: FileText, path: "/dashboard/payroll" },
        { name: "Requests", icon: Mail, path: "/dashboard/requests" },
        { name: "Positions", icon: Briefcase, path: "/dashboard/positions" },
    ];

    return (
        <aside className="w-96 bg-[#FDF6EC] text-[#3C1E1E] font-poppins p-4 min-h-screen shadow-lg relative">
            <div className="mb-8 flex items-center justify-center">
                <Image
                    src="/logo/celestia-hr-logo.png"
                    alt="Logo"
                    width={250}
                    height={250}
                    className="object-contain"
                    priority
                />
            </div>
            <ul className="space-y-4">
                {links.map(({ name, icon: Icon, path }) => (
                    <li key={name}>
                        <Link
                            href={path}
                            className={`flex items-center space-x-2 p-3 py-4 rounded-xl ${pathname === path
                                ? "bg-[#4A0E0E] text-white"
                                : "hover:bg-[#EBD8C3]"
                                }`}
                        >
                            <Icon className="w-5 h-5 me-4" />
                            <span>{name}</span>
                        </Link>
                    </li>
                ))}
            </ul>
            <div className="absolute bottom-4 left-4 text-xs text-yellow-800 opacity-60 flex items-center">
                <Image src="/logo/logo_outline.png" alt="Celestia Logo" width={48} height={48} />
                <span className="ml-1 text-lg">© Celestia Hotel 2025</span>
            </div>
        </aside>
    );
}
