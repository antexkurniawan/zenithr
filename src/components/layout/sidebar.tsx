
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
import Image from "next/image";

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
        <Link href="/" className="flex items-center justify-center py-2 group-data-[collapsible=icon]:py-0">
            <Image
                src="/zenithr-logo.png"
                alt="ZENITHR Logo"
                width={100}
                height={150}
                className="h-10 w-auto object-contain transition-all duration-300 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10"
                priority
            />
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
