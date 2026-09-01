"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import {
  navIcons,
  IconLogout,
  IconMenu,
  IconChevron,
  IconClose,
  type NavIconKey,
} from "@/components/icons";
import type { Hue } from "@/components/ui";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
  roles: readonly string[];
};

type NavGroup = {
  heading: string;
  hue: Hue;
  items: NavItem[];
};

const ALL = ["admin", "teacher", "student", "parent"] as const;
const STAFF = ["admin", "teacher"] as const;

/** Grouped rather than one flat list of eighteen.
 *
 *  The old sidebar put Classes and Billing at identical weight and ran past
 *  the fold before it ended. Grouping gives the eye somewhere to land, and the
 *  hue per group means a daily user stops reading labels and starts reaching
 *  for a colour. */
const NAV: NavGroup[] = [
  {
    heading: "School",
    hue: "people",
    items: [
      { href: "/dashboard", label: "Overview", icon: "overview", roles: ALL },
      { href: "/dashboard/classes", label: "Classes", icon: "classes", roles: STAFF },
      { href: "/dashboard/subjects", label: "Subjects", icon: "subjects", roles: STAFF },
      { href: "/dashboard/students", label: "Students", icon: "students", roles: STAFF },
      { href: "/dashboard/children", label: "My children", icon: "students", roles: ["parent"] },
    ],
  },
  {
    heading: "Learning",
    hue: "learning",
    items: [
      { href: "/dashboard/results", label: "Results", icon: "results", roles: ALL },
      { href: "/dashboard/assignments", label: "Assignments", icon: "assignments", roles: ALL },
      { href: "/dashboard/cbt", label: "Tests (CBT)", icon: "cbt", roles: ALL },
      { href: "/dashboard/report-cards", label: "Report cards", icon: "reports", roles: ALL },
      { href: "/dashboard/class-notes", label: "Class notes", icon: "classNotes", roles: ALL },
      { href: "/dashboard/lesson-notes", label: "Lesson notes", icon: "lessonNotes", roles: STAFF },
    ],
  },
  {
    heading: "Day to day",
    hue: "time",
    items: [
      { href: "/dashboard/attendance", label: "Attendance", icon: "attendance", roles: ALL },
      { href: "/dashboard/timetable", label: "Timetable", icon: "timetable", roles: ALL },
      { href: "/dashboard/events", label: "Events", icon: "events", roles: ALL },
      { href: "/dashboard/transport", label: "Transport", icon: "transport", roles: ALL },
    ],
  },
  {
    heading: "Money",
    hue: "money",
    items: [
      { href: "/dashboard/fees", label: "Fees", icon: "fees", roles: ALL },
      { href: "/dashboard/analytics", label: "Analytics", icon: "analytics", roles: STAFF },
    ],
  },
  {
    heading: "People & comms",
    hue: "comms",
    items: [
      { href: "/dashboard/announcements", label: "Announcements", icon: "announcements", roles: ALL },
      { href: "/dashboard/notifications", label: "Notifications", icon: "bell", roles: ALL },
      { href: "/dashboard/guardians", label: "Guardians", icon: "team", roles: STAFF },
      { href: "/dashboard/team", label: "Team", icon: "team", roles: STAFF },
    ],
  },
  {
    heading: "Admin",
    hue: "admin",
    items: [
      { href: "/dashboard/billing", label: "Billing", icon: "fees", roles: ["admin"] },
      { href: "/dashboard/settings", label: "Settings", icon: "settings", roles: ["admin"] },
    ],
  },
];

export default function AppShell({
  schoolName,
  planLabel,
  userName,
  userRole,
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles.includes(userRole)),
  })).filter((g) => g.items.length > 0);

  const current = groups.flatMap((g) => g.items).find((i) => isActive(i.href));

  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div
      className="kh-shell min-h-screen bg-page"
      style={{ "--kh-sidebar-w": collapsed ? "4.75rem" : "16.5rem" } as React.CSSProperties}
    >
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-sand-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`kh-sidebar flex flex-col overflow-hidden border-r border-line-soft bg-card transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-3 px-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10">
              <LogoMark className="h-7 w-7" />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-extrabold leading-tight tracking-[-0.01em] text-ink">
                  {schoolName}
                </span>
                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                  {planLabel}
                </span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-hover lg:hidden"
            aria-label="Close menu"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {groups.map((group) => (
            <div key={group.heading} data-hue={group.hue} className="mb-5">
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.13em] text-ink-subtle">
                  {group.heading}
                </p>
              )}
              {collapsed && <div className="mx-3 mb-2 border-t border-line-soft" />}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = navIcons[item.icon];
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl transition-colors duration-150 ${
                        collapsed ? "justify-center px-2.5 py-2" : "px-3 py-2"
                      } ${
                        active
                          ? "kh-tint-strong font-semibold"
                          : "text-ink-muted hover:bg-hover hover:text-ink"
                      }`}
                    >
                      {/* The active marker is a bar in the section's own hue
                          rather than a filled gradient row — six saturated
                          rows in a sidebar is a lot of shouting. */}
                      {active && !collapsed && (
                        <span
                          className="kh-hue-bg absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                          active ? "kh-hue-text" : ""
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      {!collapsed && (
                        <span
                          className={`truncate text-[13.5px] ${
                            active ? "kh-hue-text" : "font-medium"
                          }`}
                        >
                          {item.label}
                        </span>
                      )}
                      {item.href === "/dashboard/notifications" && unreadCount > 0 && (
                        <span
                          className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white ${
                            collapsed ? "absolute right-1 top-0.5" : "ml-auto"
                          }`}
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="shrink-0 border-t border-line-soft p-3">
          <div
            className={`mb-1 flex items-center gap-3 rounded-xl bg-sunken p-2.5 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
              {initials || "?"}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{userName}</p>
                <p className="truncate text-[11px] capitalize text-ink-subtle">{userRole}</p>
              </div>
            )}
          </div>

          <ThemeToggle collapsed={collapsed} />

          <form action={signOutAction}>
            <button
              type="submit"
              title={collapsed ? "Sign out" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 ${
                collapsed ? "justify-center px-2.5" : ""
              }`}
            >
              <IconLogout className="h-5 w-5 shrink-0" />
              {!collapsed && "Sign out"}
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line-soft bg-page/85 px-4 backdrop-blur-lg sm:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-hover lg:hidden"
            aria-label="Open menu"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-10 w-10 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-hover hover:text-ink lg:flex"
          >
            <IconChevron
              className={`h-5 w-5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">
              {current?.label ?? "Dashboard"}
            </p>
            <p className="truncate text-xs text-ink-subtle lg:hidden">{schoolName}</p>
          </div>
        </header>

        <main className="px-4 py-7 sm:px-8 sm:py-9">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
