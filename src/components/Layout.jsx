import { useEffect, useState } from 'react';
import { LayoutDashboard, Factory, Wrench, BarChart3, Boxes, Bot, Bell } from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'machines', label: 'Machines', icon: Factory },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'twin', label: 'Digital Twin', icon: Boxes },
  { id: 'assistant', label: 'Assistant', icon: Bot },
];

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  machines: 'Machines',
  maintenance: 'Maintenance',
  analytics: 'Analytics',
  twin: 'Digital Twin',
  assistant: 'Assistant',
};

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <span className="font-mono tnum text-[13px] text-sf-muted">
      {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
    </span>
  );
}

export default function Layout({ activeView, onNavigate, alertCount = 0, children }) {
  return (
    <div className="flex h-screen bg-sf-bg text-sf-text overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-sf-panel border-r border-sf-border flex flex-col">
        <div className="px-4 py-4 border-b border-sf-border">
          <div className="font-mono text-[16px] font-semibold tracking-wide text-sf-text">SF-4.0</div>
          <div className="text-[12px] text-sf-muted mt-0.5">Smart Factory</div>
        </div>
        <nav className="flex-1 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] border-l-2 text-left transition-colors ${
                  active
                    ? 'bg-sf-panel2 border-sf-text text-sf-text'
                    : 'border-transparent text-sf-muted hover:bg-sf-panel2 hover:text-sf-text'
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-sf-border bg-sf-panel">
          <h1 className="text-[15px] font-semibold text-sf-text">
            {VIEW_TITLES[activeView] || activeView}
          </h1>
          <div className="flex items-center gap-4">
            <LiveClock />
            <button
              onClick={() => onNavigate('maintenance')}
              className="relative p-1.5 text-sf-muted hover:text-sf-text"
              aria-label="Alerts"
            >
              <Bell size={18} />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sf-critical text-white text-[10px] font-mono tnum flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-sf-bg">{children}</main>
      </div>
    </div>
  );
}
