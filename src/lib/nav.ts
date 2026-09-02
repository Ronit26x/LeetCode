export type NavKey = "today" | "backlog" | "problems" | "stats" | "settings";

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "today", href: "/today", label: "Today" },
  { key: "backlog", href: "/backlog", label: "Backlog" },
  { key: "problems", href: "/problems", label: "Problems" },
  { key: "stats", href: "/stats", label: "Stats" },
  { key: "settings", href: "/settings", label: "Settings" },
];

export function activeNavKey(pathname: string): NavKey | null {
  if (pathname.startsWith("/today") || pathname.startsWith("/review")) return "today";
  for (const item of NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) return item.key;
  }
  return null;
}

export function breadcrumbFor(pathname: string): string[] {
  if (pathname.startsWith("/review")) return ["Today", "Session"];
  if (pathname === "/problems/new") return ["Problems", "New"];
  if (pathname.startsWith("/problems/")) return ["Problems"];
  const item = NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
  return item ? [item.label] : [];
}
