import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';

const btn =
  'flex items-center gap-1.5 rounded border border-line bg-bg-tertiary px-3 py-1.5 font-mono text-xs text-txt-primary transition hover:border-accent-blue/50 hover:text-accent-blue';

export default function Controls() {
  const { paused, setPaused, tickOnce, reset } = useDashboard();
  return (
    <section className="flex items-center gap-2 rounded-xl border border-line bg-bg-secondary p-3">
      <button className={btn} onClick={() => void tickOnce()}>
        <SkipForward size={13} /> Tick
      </button>
      <button className={btn} onClick={() => setPaused(!paused)}>
        {paused ? <Play size={13} /> : <Pause size={13} />}
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button className={btn} onClick={() => void reset()}>
        <RotateCcw size={13} /> Reset
      </button>
      <span className="ml-2 font-mono text-[10px] text-txt-secondary/70">
        {paused ? 'Simulation paused' : 'Auto-tick every 2s'}
      </span>
    </section>
  );
}
