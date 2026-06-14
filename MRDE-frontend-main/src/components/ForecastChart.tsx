import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LabelProps } from 'recharts';
import { useDashboard } from '../state/DashboardContext';

const SERIES = [
  { key: 'umrs', name: 'UMRS', color: '#4fc3f7', width: 2.5 },
  { key: 'collision', name: 'Collision', color: '#ef5350', width: 1 },
  { key: 'health', name: 'Health', color: '#26c6da', width: 1 },
  { key: 'ground', name: 'Ground', color: '#ffa726', width: 1 },
  { key: 'weather', name: 'Weather', color: '#66bb6a', width: 1 },
] as const;

const EVENT_LABEL_Y = 115;

function EventLabel(props: LabelProps & { index: number }) {
  const { x, index } = props;
  if (x === undefined) return null;
  const y = EVENT_LABEL_Y - (index % 3) * 14;
  return (
    <text x={x} y={y} fill="#9aa0a6" fontSize={9} textAnchor="middle" fontFamily="monospace">
      ^
    </text>
  );
}

export default function ForecastChart({ dark, compact }: { dark?: boolean; compact?: boolean }) {
  const { forecast } = useDashboard();
  const hours = forecast?.hours ?? [];
  const eventHours = hours.filter((h) => h.events && h.events.length > 0);
  const bd = dark ? 'border-gray-800' : 'border-line';
  const bg = dark ? 'bg-gray-900/50' : 'bg-bg-secondary';
  const txtMuted = dark ? 'text-gray-500' : 'text-txt-secondary';
  const gridColor = dark ? '#374151' : '#1a1d24';
  const chartHeight = compact ? 'h-32' : 'h-60';
  const chartMinW = compact ? 250 : 560;
  const tickFont = compact ? 8 : 10;
  const legendFont = compact ? 'text-[8px]' : 'text-[10px]';
  const headingFont = compact ? 'text-[10px]' : 'text-[11px]';
  const legendDot = compact ? 'w-3 h-0.5' : 'w-4 h-0.5';
  const noLegend = compact;

  return (
    <section className={`rounded-xl border ${bd} ${bg} p-2 ${compact ? '!border-0 !bg-transparent' : 'p-4'}`}>
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-1 ${compact ? 'mb-1' : ''}`}>
        <h3 className={`${headingFont} font-semibold uppercase tracking-[0.18em] ${txtMuted}`}>24H Forecast</h3>
        {!noLegend && (
          <div className={`ml-auto flex flex-wrap items-center gap-3 font-mono ${legendFont} ${txtMuted}`}>
            {SERIES.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span className={`inline-block ${legendDot} rounded`} style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className={`mt-1 ${chartHeight} min-w-0 overflow-x-auto`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={chartMinW}>
          <LineChart data={hours} margin={{ top: compact ? 12 : 28, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 23]}
              ticks={[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]}
              tick={{ fill: dark ? '#6b7280' : '#9aa0a6', fontSize: tickFont }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis domain={[0, 100]} tick={{ fill: dark ? '#6b7280' : '#9aa0a6', fontSize: tickFont }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: dark ? '#111827' : '#111318',
                border: dark ? '1px solid #374151' : '1px solid #23262d',
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: '#9aa0a6' }}
              labelFormatter={(h) => `Hour ${h}`}
            />
            {eventHours.map((h, i) => (
              <ReferenceLine
                key={h.hour}
                x={h.hour}
                stroke="#9aa0a6"
                strokeOpacity={0.45}
                strokeDasharray="2 4"
                label={<EventLabel index={i} />}
              />
            ))}
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={s.width}
                strokeOpacity={s.key === 'umrs' ? 1 : 0.65}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
