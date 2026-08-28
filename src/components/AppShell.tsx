"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import {
  navIcons,
  IconLogout,
  IconMenu,
  IconChevron,
  IconClose,
  type NavIconKey,
} from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
  roles: readonly string[];
};

const ALL = ["admin", "teacher", "student", "parent"] as const;
const STAFF = ["admin", "teacher"] as const;

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "overview", roles: ALL },
  { href: "/dashboard/classes", label: "Classes", icon: "classes", roles: STAFF },
  { href: "/dashboard/subjects", label: "Subjects", icon: "subjects", roles: STAFF },
  { href: "/dashboard/students", label: "Students", icon: "students", roles: STAFF },
  { href: "/dashboard/children", label: "My children", icon: "students", roles: ["parent"] },
  { href: "/dashboard/attendance", label: "Attendance", icon: "attendance", roles: ALL },
  { href: "/dashboard/timetable", label: "Timetable", icon: "timetable", roles: ALL },
  { href: "/dashboard/results", label: "Results", icon: "results", roles: ALL },
  { href: "/dashboard/fees", label: "Fees", icon: "fees", roles: ALL },
  { href: "/dashboard/assignments", label: "Assignments", icon: "assignments", roles: ALL },
  { href: "/dashboard/cbt", label: "Tests (CBT)", icon: "cbt", roles: ALL },
  { href: "/dashboard/report-cards", label: "Report cards", icon: "reports", roles: ALL },
  { href: "/dashboard/analytics", label: "Analytics", icon: "analytics", roles: STAFF },
  { href: "/dashboard/class-notes", label: "Class notes", icon: "classNotes", roles: ALL },
  { href: "/dashboard/lesson-notes", label: "Lesson notes", icon: "lessonNotes", roles: STAFF },
  { href: "/dashboard/announcements", label: "Announcements", icon: "announcements", roles: ALL },
  { href: "/dashboard/events", label: "Events", icon: "events", roles: ALL },
  { href: "/dashboard/transport", label: "Transport", icon: "transport", roles: ALL },
  { href: "/dashboard/guardians", label: "Guardians", icon: "team", roles: STAFF },
  { href: "/dashboard/team", label: "Team", icon: "team", roles: STAFF },
  { href: "/dashboard/notifications", label: "Notifications", icon: "bell", roles: ALL },
  { href: "/dashboard/billing", label: "Billing", icon: "fees", roles: ["admin"] },
  { href: "/dashboard/settings", label: "Settings", icon: "settings", roles: ["admin"] },
];

export default function AppShell({
  schoolName,
  planLabel,
  userName,
  userRole,
  isStaff,
  unreadCount = 0,
  signOutAction,
  children,
}: {
  schoolName: string;
  planLabel: string;
  userName: string;
  userRole: string;
  isStaff: boolean;
  unreadCount?: number;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the drawer whenever navigation happens.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Remember the collapsed preference across visits.
  useEffect(() => {
    const stored = localStorage.getItem("kh:sidebar");
    if (stored === "collapsed") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      localStorage.setItem("kh:sidebar", v ? "expanded" : "collapsed");
      return !v;
    });
  }

  const items = NAV.filter((i) => i.roles.includes(userRole));
  const current = items.find((i) =>
    i.href === "/dashboard" ? pathname === i.href : pathname.startsWith(i.href)
  );

  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div
      className="kh-shell min-h-screen bg-slate-50"
      style={{ "--kh-sidebar-w": collapsed ? "4.75rem" : "16rem" } as React.CSSProperties}
    >
      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`kh-sidebar flex flex-col overflow-hidden border-r border-slate-200 bg-white transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-100">
              <LogoMark className="h-7 w-7" />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold tracking-tight text-brand-900">
                  {schoolName}
                </span>
                <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-brand-600">
                  {planLabel}
                </span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const Icon = navIcons[item.icon];
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-xl transition-all duration-200 ${
                  collapsed ? "justify-center px-2.5 py-2.5" : "px-3 py-2.5"
                } ${
                  active
                    ? "bg-brand-gradient text-white shadow-brand"
                    : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    active ? "bg-white/20" : "bg-slate-100 group-hover:bg-white"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {!collapsed && (
                  <span className="whitespace-nowrap text-sm font-semibold">
                    {item.label}
                  </span>
                )}
                {item.href === "/dashboard/notifications" && unreadCount > 0 && (
                  <span
                    className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      active ? "bg-white/25 text-white" : "bg-brand-600 text-white"
                    } ${collapsed ? "absolute right-1 top-1" : ""}`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-slate-100 p-3">
          <div
            className={`flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
              {initials || "?"}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
                <p className="truncate text-xs capitalize text-slate-500">{userRole}</p>
              </div>
            )}
          </div>
          <form action={signOutAction} className="mt-2">
            <button
              type="submit"
              title={collapsed ? "Sign out" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 ${
                collapsed ? "justify-center px-2.5" : ""
              }`}
            >
              <IconLogout className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && "Sign out"}
            </button>
          </form>
        </div>

      </aside>

      {/* Content */}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-lg sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600 lg:flex"
          >
            <IconChevron
              className={`h-5 w-5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {current?.label ?? "Dashboard"}
            </p>
            <p className="truncate text-xs text-slate-500 lg:hidden">{schoolName}</p>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
