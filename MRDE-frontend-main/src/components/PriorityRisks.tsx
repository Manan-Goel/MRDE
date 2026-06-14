import { motion } from 'framer-motion';
import { ListOrdered } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import LevelBadge from './LevelBadge';
import { LEVEL_COLORS, levelOf } from '../api/risk';

const riskId = (component: string, priority: number) => {
  const prefix = component.split(/\s+/).map(w => w[0]).join('').toUpperCase();
  return `${prefix}-${String(priority).padStart(2, '0')}`;
};

export default function PriorityRisks() {
  const { dashboard } = useDashboard();
  const items = [...(dashboard?.priority ?? [])].sort((a, b) => a.priority - b.priority);

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-line bg-bg-secondary">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <ListOrdered size={15} className="text-accent-blue" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-txt-secondary">
          Risk Priority
        </h3>
        {dashboard?.scores && (
          <span className="ml-auto flex items-center gap-2">
            <span className="font-mono text-xs text-txt-secondary">UMRS</span>
            <span className="font-mono text-base text-txt-primary">{dashboard.scores.umrs.toFixed(1)}</span>
            <LevelBadge level={dashboard.scores.level} />
          </span>
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {items.length === 0 && (
          <p className="py-4 text-center font-mono text-xs text-txt-secondary/60">No risks to display.</p>
        )}
        {items.map((item) => {
          const rid = riskId(item.component, item.priority);
          const ctx = item.context ?? {};
          const ctxEntries = Object.entries(ctx).slice(0, 3);
          const lvl = item.level ?? levelOf(item.score);
          return (
            <motion.div
              key={rid}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
              className="rounded-lg border border-line bg-bg-tertiary/50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-txt-secondary">{rid}</span>
                  <span className="text-sm font-medium text-txt-primary">{item.component}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg" style={{ color: LEVEL_COLORS[lvl] }}>
                    {item.score.toFixed(0)}
                  </span>
                  <LevelBadge level={lvl} />
                </div>
              </div>
              {ctxEntries.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {ctxEntries.map(([k, v]) => (
                    <span key={k} className="font-mono text-[10px] text-txt-secondary/60">
                      {k.replace(/_/g, ' ')}: <span className="text-txt-secondary">{String(v)}</span>
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
