"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Download,
  Rocket,
  GitBranch,
  ScrollText,
  Settings,
  Key,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/exports", label: "Exportaciones", icon: Download },
  { href: "/deploys", label: "Deploys", icon: Rocket },
  { href: "/repositories", label: "Repositorios", icon: GitBranch },
  { href: "/logs", label: "Logs", icon: ScrollText },
];

const settingsItems = [
  { href: "/settings", label: "Configuración", icon: Settings },
  { href: "/settings/api-keys", label: "API Keys", icon: Key },
  { href: "/settings/account", label: "Cuenta", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center justify-center border-b border-sidebar-border px-4 py-3">
        <Link href="/dashboard">
          <Image
            src="/GO-TO.png"
            alt="Go To Marketing"
            width={160}
            height={72}
            className="object-contain"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg gradient-gold opacity-90"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Settings section */}
        <div className="mt-6 pt-4 border-t border-sidebar-border">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Configuración
          </p>
          <div className="space-y-0.5">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-settings-active"
                      className="absolute inset-0 rounded-lg gradient-gold opacity-90"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4 shrink-0" />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <span className="text-xs text-sidebar-foreground/60 truncate">Mi cuenta</span>
        </div>
      </div>
    </aside>
  );
}
