import { motion } from 'framer-motion';
import { useDashboard } from '../state/DashboardContext';
import { LEVEL_COLORS, levelOf } from '../api/risk';
import LevelBadge from './LevelBadge';

const ROWS = [
  { key: 'collision', label: 'Collision Risk' },
  { key: 'weather', label: 'Space Weather' },
  { key: 'ground', label: 'Ground Segment' },
  { key: 'health', label: 'Spacecraft Health' },
] as const;

export default function RiskBars({ dark }: { dark?: boolean }) {
  const { dashboard } = useDashboard();
  const bd = dark ? 'border-gray-800' : 'border-line';
  const bg = dark ? 'bg-gray-900/50' : 'bg-bg-secondary';
  const bgBar = dark ? 'bg-gray-800' : 'bg-bg-tertiary';
  const txt = dark ? 'text-gray-300' : 'text-txt-primary';
  const txtMuted = dark ? 'text-gray-500' : 'text-txt-secondary';
  const headingCls = dark ? 'text-gray-500' : 'text-txt-secondary';

  if (!dashboard) {
    return (
      <section className={`rounded-xl border ${bd} ${bg} p-5`}>
        <h3 className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${headingCls}`}>Risk Breakdown</h3>
        <p className={`mt-4 font-mono text-xs ${txtMuted}`}>Loading...</p>
      </section>
    );
  }
  const { scores } = dashboard;

  return (
    <section className={`rounded-xl border ${bd} ${bg} p-5`}>
      <h3 className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${headingCls}`}>Risk Breakdown</h3>
      <div className="mt-4 space-y-3">
        {ROWS.map(({ key, label }) => {
          const v = scores[key];
          const lvl = levelOf(v);
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={txt}>{label}</span>
                <span className={`font-mono ${txtMuted}`}>
                  {v.toFixed(1)} <span style={{ color: LEVEL_COLORS[lvl] }}>{lvl}</span>
                </span>
              </div>
              <div className={`h-2 overflow-hidden rounded-full ${bgBar}`}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: LEVEL_COLORS[lvl] }}
                  animate={{ width: `${Math.min(100, Math.max(0, v))}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className={`mt-5 flex items-center justify-between border-t ${bd} pt-4`}>
        <span className={`text-[11px] uppercase tracking-[0.18em] ${headingCls}`}>UMRS</span>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-2xl ${txt}`}>{scores.umrs.toFixed(1)}</span>
          <LevelBadge level={scores.level} />
        </div>
      </div>
    </section>
  );
}
