import { NavLink, Outlet } from "react-router";
import {
  Activity,
  Container,
  Cpu,
  Gpu,
  HardDrive,
  House,
  ListTree,
  MemoryStick,
  Network,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OnlineStatus, useHealth } from "@/components/online-status";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", label: "HOME", icon: House, end: true },
  { to: "/cpu", label: "CPU", icon: Cpu },
  { to: "/mem", label: "MEM", icon: MemoryStick },
  { to: "/disk", label: "DISK", icon: HardDrive },
  { to: "/process", label: "PROCESS", icon: ListTree },
  { to: "/netlink", label: "NETLINK", icon: Network },
  { to: "/docker", label: "DOCKER", icon: Container },
  { to: "/gpu", label: "GPU", icon: Gpu },
];

export function RootLayout() {
  const { isError } = useHealth();

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <nav className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <NavLink to="/" className="flex items-center gap-2">
            <Activity className="size-5 text-green-500" />
            <span className="text-lg font-semibold tracking-tight">Axmon</span>
          </NavLink>
          <div className="flex flex-1 items-center justify-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    isActive && "bg-accent text-foreground",
                  )
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
          <OnlineStatus />
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* 后端探活失败时各页面也必然拉不到数据，渲染出来全是错误卡，
            不如整块换成离线提示；pending 期间保持 Outlet，避免首屏闪一下。 */}
        {isError ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <p className="text-lg font-medium">Backend unreachable</p>
            <p className="text-sm text-muted-foreground">
              The monitoring server is offline. Pages will come back once it
              recovers.
            </p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
