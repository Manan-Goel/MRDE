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

export default function ForecastChart() {
  const { forecast } = useDashboard();
  const hours = forecast?.hours ?? [];
  const eventHours = hours.filter((h) => h.events && h.events.length > 0);

  return (
    <section className="rounded-xl border border-line bg-bg-secondary p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-txt-secondary">24-Hour Forecast</h3>
        <div className="ml-auto flex flex-wrap items-center gap-3 font-mono text-[10px] text-txt-secondary">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 h-60 min-w-0 overflow-x-auto">
        <ResponsiveContainer width="100%" height="100%" minWidth={560}>
          <LineChart data={hours} margin={{ top: 28, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#1a1d24" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 23]}
              ticks={[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]}
              tick={{ fill: '#9aa0a6', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis domain={[0, 100]} tick={{ fill: '#9aa0a6', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#111318', border: '1px solid #23262d', borderRadius: 8, fontSize: 11 }}
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
