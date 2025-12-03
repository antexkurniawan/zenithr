
"use client";

import {
  FileText,
  FileWarning,
  Home,
  LineChart,
  Users,
  User,
  CalendarCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/pegawai", label: "Pegawai", icon: Users },
  { href: "/briefings", label: "Briefing", icon: FileText },
  { href: "/warnings", label: "Surat Peringatan", icon: FileWarning },
  { href: "/absensi", label: "Absensi", icon: CalendarCheck },
  { href: "/laporan", label: "Laporan", icon: LineChart },
  { href: "/profil", label: "Profil", icon: User },
];

export function SiteSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg px-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6 text-sidebar-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span className="group-data-[collapsible=icon]:hidden">ZENITHR</span>
        </Link>
      </SidebarHeader>
      <SidebarMenu className="p-2">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href}>
              <SidebarMenuButton
                isActive={isActive(item.href)}
                tooltip={{ children: item.label }}
                className="w-full justify-start"
              >
                <item.icon className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </Sidebar>
  );
}
