import { AnimatePresence, motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';

export default function LiveEvents({ dark }: { dark?: boolean }) {
  const { dashboard } = useDashboard();
  const events = (dashboard?.recent_events ?? []).slice(-6).reverse();
  const bd = dark ? 'border-gray-800' : 'border-line';
  const bg = dark ? 'bg-gray-900/50' : 'bg-bg-secondary';
  const txt = dark ? 'text-gray-300' : 'text-txt-primary';
  const txtMuted = dark ? 'text-gray-500' : 'text-txt-secondary';

  return (
    <section className={`rounded-xl border ${bd} ${bg} p-4`}>
      <div className="flex items-center gap-2">
        <Radio size={14} className="text-accent-cyan" />
        <h3 className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${txtMuted}`}>Live Events</h3>
      </div>
      <ul className="mt-3 space-y-1.5">
        {events.length === 0 && <li className={`font-mono text-xs ${txtMuted}/60`}>No events yet.</li>}
        <AnimatePresence initial={false}>
          {events.map((e, i) => (
            <motion.li
              key={`${e}-${i}`}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className={`font-mono text-xs ${txt}`}
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
