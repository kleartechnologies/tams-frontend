'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export interface RevPoint { month: string; revenue: number }

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <p className="chart-tooltip-value">RM {payload[0].value.toLocaleString('en-US')}</p>
    </div>
  );
}

export default function RevenueChart({ data, loading }: { data: RevPoint[]; loading?: boolean }) {
  if (loading) {
    return (
      <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 4px' }}>
        {[60, 85, 45, 90, 70, 100].map((h, i) => (
          <div key={i} className="skeleton" style={{ flex: 1, height: `${h}%`, borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--ink-5)' }}>No revenue data for this period.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--accent)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--line)" strokeDasharray="0" vertical={false} />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'var(--ink-5)', fontFamily: 'inherit' }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'var(--ink-5)', fontFamily: 'inherit' }}
            tickFormatter={(v) => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
            width={36}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--line)', strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'white', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
