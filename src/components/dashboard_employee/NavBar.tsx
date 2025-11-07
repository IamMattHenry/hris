"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { House, User, Users, UserCheck, Mail, Cog } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
    const pathname = usePathname();

    const links = [
        { name: "Overview", icon: House, path: "/dashboard_employee" },
        { name: "Profile", icon: User, path: "/dashboard_employee/profile" },
        { name: "Dependant", icon: Users, path: "/dashboard_employee/dependant" },
        { name: "Attendance", icon: UserCheck, path: "/dashboard_employee/attendance" },
        { name: "Request", icon: Mail, path: "/dashboard_employee/request" },
        { name: "Settings", icon: Cog, path: "/dashboard_employee/settings" },
    ];

    return (
            <nav className="bg-[#073532] text-[#FFF2E0] font-poppins shadow-xl">
                <div className="max-w-8xl mx-auto px-8 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center">
                            <Image
                                src="/logo/celestia-logo.png"
                                alt="Celestia Logo"
                                width={75}
                                height={75}
                                className="object-contain"
                                priority
                            />
                            <h2 className="text-3xl font-thin text-[#D4A056] font-abril">
                                CELESTIA Hotel
                            </h2>
                            
                           
                        </div>

                        {/* Navigation Links */}
                        <ul className="flex items-center space-x-2">
                            {links.map(({ name, icon: Icon, path }) => (
                                <li key={name}>
                                    <Link
                                        href={path}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${pathname === path
                                            ? "bg-[#073532] text-white"
                                            : "hover:bg-[#385d5a]"
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{name}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </nav>
    );

}