'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { DailyWorkoutCount } from '@/lib/queries';

type Props = { data: DailyWorkoutCount[] };

export default function WorkoutsChart({ data }: Props) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-medium text-gray-400">
        Workouts — Last 30 Days
      </h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
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
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
            />
            <Bar
              dataKey="started"
              name="Started"
              fill="#f59e0b"
              radius={[3, 3, 0, 0]}
              fillOpacity={0.6}
            />
            <Bar
              dataKey="completed"
              name="Completed"
              fill="#10b981"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
