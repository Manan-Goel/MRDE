import { RiskLevel } from '../api/types';
import { LEVEL_BADGE } from '../api/risk';

export default function LevelBadge({ level, className = '' }: { level: RiskLevel; className?: string }) {
  const pulse = level === 'CRITICAL' ? 'animate-pulseSoft' : '';
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-widest ${LEVEL_BADGE[level]} ${pulse} ${className}`}
    >
      {level}
    </span>
  );
}
