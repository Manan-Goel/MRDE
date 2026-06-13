import { AnimatePresence, motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';

export default function LiveEvents() {
  const { dashboard } = useDashboard();
  const events = (dashboard?.recent_events ?? []).slice(-6).reverse();

  return (
    <section className="rounded-xl border border-line bg-bg-secondary p-4">
      <div className="flex items-center gap-2">
        <Radio size={14} className="text-accent-cyan" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-txt-secondary">Live Events</h3>
      </div>
      <ul className="mt-3 space-y-1.5">
        {events.length === 0 && <li className="font-mono text-xs text-txt-secondary/60">No events yet.</li>}
        <AnimatePresence initial={false}>
          {events.map((e, i) => (
            <motion.li
              key={`${e}-${i}`}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="font-mono text-xs text-txt-primary"
            >
              <span className="mr-2 text-accent-cyan">▸</span>
              {e}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
