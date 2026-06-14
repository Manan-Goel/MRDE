import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import { CONF_BADGE, TIME_BADGE } from '../api/risk';

const riskId = (component: string, priority: number) => {
  const prefix = component.split(/\s+/).map(w => w[0]).join('').toUpperCase();
  return `${prefix}-${String(priority).padStart(2, '0')}`;
};

export default function RecommendationList() {
  const { dashboard } = useDashboard();
  const recs = [...(dashboard?.recommendations ?? [])].sort((a, b) => a.priority - b.priority);

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-line bg-bg-secondary">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <Lightbulb size={15} className="text-accent-blue" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-txt-secondary">
          Recommendations
        </h3>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {recs.length === 0 && (
          <p className="py-4 text-center font-mono text-xs text-txt-secondary/60">No recommendations.</p>
        )}
        {recs.map((r) => {
          const rid = riskId(r.component, r.priority);
          return (
            <motion.article
              key={rid}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
              className="rounded-lg border border-line bg-bg-tertiary/50 p-4"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-txt-secondary">{rid}</span>
                <span className="text-sm font-medium text-txt-primary">{r.component}</span>
                <span className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] font-semibold ${TIME_BADGE[r.time_sensitivity]}`}>
                  {r.time_sensitivity}
                </span>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${CONF_BADGE[r.confidence]}`}>
                  {r.confidence}
                </span>
              </div>
              <h4 className="mt-2 text-sm font-semibold leading-snug text-txt-primary">{r.headline}</h4>
              <p className="mt-1 text-xs leading-relaxed text-txt-secondary">{r.explanation}</p>
              <p className="mt-2 text-xs leading-relaxed text-txt-primary">
                {r.recommended_action}
              </p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
