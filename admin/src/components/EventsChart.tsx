'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailyCount } from '@/lib/queries';

type Props = { data: DailyCount[] };

export default function EventsChart({ data }: Props) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-medium text-gray-400">
        Events — Last 30 Days
      </h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 8,
                fontSize: 13,
              }}
              labelStyle={{ color: '#d1d5db' }}
              itemStyle={{ color: '#34d399' }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
