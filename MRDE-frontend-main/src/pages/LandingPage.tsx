import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Earth,
  Globe2,
  LogOut,
  Menu,
  RotateCcw,
  Satellite,
} from 'lucide-react';
import { getAlerts, getState, resetSim, tick } from '../api/endpoints';
import type { AlertItem, GlobalState } from '../api/types';
import { logout } from '../auth/auth';
import { useTheme } from '../state/ThemeContext';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'border-risk-critical/40 bg-risk-critical/8 text-risk-critical',
  HIGH: 'border-risk-high/40 bg-risk-high/8 text-risk-high',
  MODERATE: 'border-risk-moderate/40 bg-risk-moderate/8 text-risk-moderate',
  LOW: 'border-risk-low/40 bg-risk-low/8 text-risk-low',
};

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };

export default function LandingPage() {
  const [state, setState] = useState<GlobalState | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const pollingRef = useRef(false);

  const fetchAll = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([getState(), getAlerts()]);
      setState(s);
      setAlerts(a.alerts);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchAll();
    const id = setInterval(() => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      void tick(1).then(() => fetchAll()).finally(() => { pollingRef.current = false; });
    }, 2000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const activeAlerts = alerts.filter((a) => !a.resolved);
  const sats = state?.satellites ?? [];
  const criticalCount = activeAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = activeAlerts.filter((a) => a.severity === 'HIGH').length;
  const moderateCount = activeAlerts.filter((a) => a.severity === 'MODERATE').length;
  const lowCount = activeAlerts.filter((a) => a.severity === 'LOW').length;

  const sortedAlerts = [...activeAlerts].sort((a, b) => {
    const aOrder = SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] ?? 99;
    const bOrder = SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (b.clock_min ?? 0) - (a.clock_min ?? 0);
  });

  const navItems = [
    { icon: Earth, label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { icon: Globe2, label: 'Globe View', onClick: () => navigate('/globe') },
  ];

  return (
    <div className="flex h-screen bg-bg-primary">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-56 flex-col border-r border-line bg-bg-secondary transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-line px-5">
          <Satellite size={18} className="text-accent-blue" />
          <span className="text-sm font-semibold tracking-wide text-txt-primary">MRDE</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-txt-secondary transition hover:bg-bg-tertiary hover:text-txt-primary"
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-txt-secondary transition hover:bg-risk-critical/10 hover:text-risk-critical"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center gap-3 border-b border-line bg-bg-secondary/90 px-4 backdrop-blur">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu size={20} className="text-txt-secondary" />
          </button>
          <Satellite size={18} className="hidden text-accent-blue sm:block" />
          <span className="text-sm font-semibold tracking-wide text-txt-primary">MRDE</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-risk-low">
            <span className="h-1.5 w-1.5 rounded-full bg-risk-low animate-pulseSoft" />
            LIVE
          </span>
          <span className="font-mono text-xs text-txt-secondary">{state?.clock_str ?? '--:--'}</span>
          <span className="hidden items-center gap-1.5 rounded border border-line px-2 py-0.5 font-mono text-[11px] text-txt-secondary sm:flex">
            <Activity size={11} /> Kp {state ? state.kp_val.toFixed(1) : '-'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => void (async () => { await resetSim(); await fetchAll(); })()}
              className="flex items-center gap-1.5 rounded border border-line px-2 py-1.5 text-txt-secondary transition hover:border-accent-blue/50 hover:text-accent-blue"
              title="Reset simulation"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded border border-line px-2 py-1.5 text-txt-secondary transition hover:border-accent-blue/50 hover:text-accent-blue"
              title="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-6 py-8">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-txt-primary">
                Mission Risk &amp; Decision Engine
              </h1>
              <p className="mt-1 text-sm text-txt-secondary">
                Real-time satellite risk monitoring and operational recommendations
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
              </div>
            ) : (
              <>
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-line bg-bg-secondary px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-txt-secondary">Satellites</p>
                    <p className="mt-1 font-mono text-xl text-txt-primary">{sats.length}</p>
                  </div>
                  <div className="rounded-lg border border-line bg-bg-secondary px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-txt-secondary">Critical</p>
                    <p className="mt-1 font-mono text-xl text-risk-critical">{criticalCount}</p>
                  </div>
                  <div className="rounded-lg border border-line bg-bg-secondary px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-txt-secondary">Total</p>
                    <p className="mt-1 font-mono text-xl text-txt-primary">{activeAlerts.length}</p>
                  </div>
                  <div className="rounded-lg border border-line bg-bg-secondary px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-txt-secondary">Sim Time</p>
                    <p className="mt-1 font-mono text-xl text-txt-primary">{state?.clock_str ?? '--'}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-txt-primary">
                    <Bell size={16} className="text-accent-blue" /> Priority Queue
                    {activeAlerts.length > 0 && (
                      <span className="rounded bg-risk-critical/15 px-1.5 py-0.5 font-mono text-[10px] text-risk-critical">
                        {activeAlerts.length} active
                      </span>
                    )}
                  </h2>
                  {sortedAlerts.length === 0 && (
                    <div className="mb-4 rounded-lg border border-line bg-bg-secondary p-6 text-center">
                      <CheckCircle2 size={24} className="mx-auto text-risk-low" />
                      <p className="mt-2 font-mono text-sm text-risk-low">All clear — no active alerts</p>
                    </div>
                  )}
                  <div className="space-y-2.5">
                    {sortedAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-4 rounded-lg border p-4 shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(0,0,0,0.45)] cursor-default ${SEVERITY_COLORS[alert.severity] ?? 'border-line bg-bg-tertiary text-txt-primary'}`}
                      >
                        <div className="flex flex-1 flex-col gap-1.5">
                          <div className="flex items-center gap-2.5">
                            <AlertTriangle size={13} />
                            <span className="font-mono text-xs font-semibold">{alert.severity}</span>
                            <span className="rounded border border-current/20 px-1.5 py-0.5 font-mono text-[10px] opacity-70">{alert.type}</span>
                            <span className="ml-auto font-mono text-[10px] text-txt-secondary/50">{alert.sat_name}</span>
                          </div>
                          <p className="text-sm leading-relaxed text-txt-primary">{alert.message}</p>
                          <span className="font-mono text-[10px] text-txt-secondary/40">{alert.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
