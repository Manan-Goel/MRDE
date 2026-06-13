import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import LevelBadge from './LevelBadge';

export default function SatelliteSelector() {
  const { state, selected, select } = useDashboard();
  const sats = [...(state?.satellites ?? [])].sort((a, b) => a.priority - b.priority);

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-line bg-bg-secondary/60 px-4 py-2">
      {sats.length === 0 && (
        <div className="py-2 font-mono text-xs text-txt-secondary">Waiting for /api/state…</div>
      )}
      {sats.map((s) => {
        const active = s.key === selected;
        return (
          <motion.button
            key={s.key}
            layout
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={() => select(s.key)}
            className={`flex min-w-[220px] items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
              active
                ? 'border-accent-blue/50 bg-bg-tertiary shadow-[0_0_20px_-10px_rgba(79,195,247,0.6)]'
                : 'border-line bg-bg-secondary hover:border-txt-secondary/40'
            }`}
          >
            <span className="font-mono text-xs text-txt-secondary">[{s.priority}]</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-mono text-xs text-txt-primary">{s.name}</span>
                {s.movement === 'up' && (
                  <motion.span
                    key={s.key}
                    initial={{ opacity: 0, y: 4, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  >
                    <ArrowUp size={12} className="text-risk-critical" />
                  </motion.span>
                )}
                {s.movement === 'down' && (
                  <motion.span
                    key={s.key}
                    initial={{ opacity: 0, y: -4, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  >
                    <ArrowDown size={12} className="text-risk-low" />
                  </motion.span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-[11px] text-txt-secondary">
                  UMRS <span className="text-txt-primary">{s.umrs.toFixed(1)}</span>
                </span>
                <LevelBadge level={s.level} />
              </div>
            </div>
          </motion.button>
        );
      })}
      <div className="ml-auto hidden items-center font-mono text-[10px] text-txt-secondary/60 lg:flex">
        keys 1 / 2 / 3 to switch
      </div>
    </div>
  );
}
