import { useNavigate } from 'react-router-dom';
import { Activity, Bell, LogOut, RotateCcw, Satellite } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import { logout } from '../auth/auth';

export default function Header() {
  const { state, reset, offline } = useDashboard();
  const navigate = useNavigate();
  const kp = state?.kp_val ?? 0;
  const kpClass =
    kp >= 6
      ? 'border-risk-critical/40 text-risk-critical'
      : kp >= 4
        ? 'border-risk-moderate/40 text-risk-moderate'
        : 'border-risk-low/40 text-risk-low';
  const alertCount = state?.alerts?.length ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-4 border-b border-line bg-bg-secondary/90 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <Satellite size={16} className="text-accent-blue" />
        <span className="text-sm font-semibold tracking-wide">MRDE</span>
      </div>
      <span className="flex items-center gap-1.5 font-mono text-[11px] text-risk-low">
        <span className={`h-1.5 w-1.5 rounded-full ${offline ? 'bg-risk-critical' : 'bg-risk-low animate-pulseSoft'}`} />
        {offline ? <span className="text-risk-critical">OFFLINE</span> : 'LIVE'}
      </span>
      <span className="font-mono text-xs text-txt-primary">{state?.clock_str ?? '--h --m'}</span>
      <div className="ml-auto flex items-center gap-3 font-mono text-xs">
        <span className={`flex items-center gap-1.5 rounded border px-2 py-0.5 ${kpClass}`}>
          <Activity size={12} /> Kp {state ? state.kp_val : '-'}
        </span>
        {alertCount > 0 && (
          <span className="flex items-center gap-1.5 rounded border border-risk-critical/40 bg-risk-critical/10 px-2 py-0.5 text-risk-critical">
            <Bell size={12} /> {state?.alert_summary ?? alertCount}
          </span>
        )}
        <button
          onClick={() => void reset()}
          className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-txt-secondary transition hover:border-accent-blue/50 hover:text-accent-blue"
        >
          <RotateCcw size={12} /> Reset
        </button>
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-txt-secondary transition hover:border-risk-critical/50 hover:text-risk-critical"
          title="Sign out"
        >
          <LogOut size={12} />
        </button>
      </div>
    </header>
  );
}
