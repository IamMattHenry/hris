"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CheckCircle, FileText, Mail, Briefcase, Building  } from "lucide-react";
import Image from "next/image";

export default function Sidebar() {
    const pathname = usePathname();

    const links = [
        { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { name: "Employees", icon: Users, path: "/dashboard/employees" },
        { name: "Attendance", icon: CheckCircle, path: "/dashboard/attendance" },
        { name: "Requests", icon: Mail, path: "/dashboard/requests" },
        { name: "Positions", icon: Briefcase, path: "/dashboard/positions" },
        { name: "Departments", icon: Building, path: "/dashboard/departments" }

    ];

    return (
        <aside className="w-96 bg-[linear-gradient(180deg,#190006_23%,#480C1B_67%,#300611_100%)] text-[#FFF2E0] font-poppins p-4 min-h-screen shadow-xl relative">
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
            <div className="absolute bottom-4 left-4 text-xs text-yellow-800 opacity-60 flex items-center">
                <Image src="/logo/logo_outline.png" alt="Celestia Logo" width={48} height={48} />
                <span className="ml-1 text-lg">© Celestia Hotel 2025</span>
            </div>
        </aside>
    );
}
