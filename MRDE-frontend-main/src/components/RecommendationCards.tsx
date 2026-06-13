import { AnimatePresence, motion } from 'framer-motion';
import { BrainCircuit, ChevronsRight } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import { CONF_BADGE, TIME_BADGE } from '../api/risk';

export default function RecommendationCards() {
  const { dashboard } = useDashboard();
  const recs = [...(dashboard?.recommendations ?? [])].sort((a, b) => a.priority - b.priority);

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-line bg-bg-secondary">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <BrainCircuit size={15} className="text-accent-blue" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-txt-secondary">
          Priority &amp; Recommendations
        </h3>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {recs.length === 0 && <p className="py-4 text-center font-mono text-xs text-txt-secondary">No recommendations.</p>}
        <AnimatePresence mode="popLayout">
          {recs.map((r) => (
            <motion.article
              key={`${r.priority}-${r.component}`}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="rounded-lg border border-line bg-bg-tertiary/60 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-txt-secondary">#{r.priority}</span>
                <span className="text-xs font-medium text-txt-primary">{r.component}</span>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${TIME_BADGE[r.time_sensitivity]}`}>
                  {r.time_sensitivity}
                </span>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${CONF_BADGE[r.confidence]}`}>
                  {r.confidence}
                </span>
              </div>
              <h4 className="mt-2 text-sm font-semibold leading-snug text-txt-primary">{r.headline}</h4>
              <p className="mt-1 text-xs leading-relaxed text-txt-secondary">{r.explanation}</p>
              <p className="mt-2 flex items-start gap-1 text-xs text-accent-blue">
                <ChevronsRight size={13} className="mt-0.5 shrink-0" />
                {r.recommended_action}
              </p>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
