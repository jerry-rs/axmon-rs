import { Link } from '@tanstack/react-router'
import { Home, Cpu, MemoryStick, HardDrive, Container, Activity, Gpu, ScrollText } from 'lucide-react'
import { useConnectionStatus } from '@/lib/connection-status'

const NAV_ITEMS = [
  { to: '/', label: 'HOME', icon: Home },
  { to: '/cpu', label: 'CPU', icon: Cpu },
  { to: '/mem', label: 'MEM', icon: MemoryStick },
  { to: '/disk', label: 'DISK', icon: HardDrive },
  { to: '/process', label: 'PROC', icon: ScrollText },
  { to: '/docker', label: 'DOCKER', icon: Container },
  { to: '/gpu', label: 'GPU', icon: Gpu },
] as const

export function NavBar() {
  const connected = useConnectionStatus()

  return (
    <header className="border-b border-border bg-card">
      <nav className="mx-auto flex max-w-7xl items-center px-6 py-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground"
        >
          <Activity size={22} className="text-primary animate-pulse" />
          AXMON
        </Link>

        <div className="flex flex-1 items-center justify-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
          <span
            className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_6px_hsl(142,76%,36%)]' : 'bg-red-500'}`}
          />
          <span className={connected ? 'text-emerald-600' : 'text-red-500'}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </nav>
    </header>
  )
}
