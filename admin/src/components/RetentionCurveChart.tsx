'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { RetentionCurvePoint } from '@/lib/queries';

type Props = { data: RetentionCurvePoint[] };

const ALL_COLOR = '#f59e0b';
const PALETTE = [
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f43f5e',
  '#3b82f6',
  '#ec4899',
];

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

export default function RetentionCurveChart({ data }: Props) {
  if (data.length === 0) return null;

  const cohorts = [...new Set(data.map((d) => d.cohort))].sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return a.localeCompare(b);
  });

  const pivoted = [1, 2, 3, 4, 5].map((n) => {
    const row: Record<string, string | number> = {
      workout: ORDINALS[n - 1],
    };
    for (const cohort of cohorts) {
      const point = data.find(
        (d) => d.cohort === cohort && d.workout_number === n,
      );
      row[cohort] = point?.pct ?? 0;
    }
    return row;
  });

  const allRow = data.find((d) => d.cohort === 'All' && d.workout_number === 1);
  const totalUsers = allRow?.user_count ?? 0;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-gray-400">
          Workout Retention Curve
        </h2>
        <p className="text-xs text-gray-500">
          {totalUsers} total users with ≥1 completion
        </p>
      </div>
      <p className="mb-4 text-xs text-gray-600">
        Of users who completed 1 workout, % who came back for more — by
        first-workout month
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pivoted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="workout"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 8,
                fontSize: 13,
              }}
              labelStyle={{ color: '#d1d5db' }}
              formatter={(value: number) => [`${value}%`]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
            {cohorts.map((cohort, i) => (
              <Line
                key={cohort}
                type="monotone"
                dataKey={cohort}
                name={cohort === 'All' ? 'All Time' : cohort}
                stroke={cohort === 'All' ? ALL_COLOR : PALETTE[(i - 1) % PALETTE.length]}
                strokeWidth={cohort === 'All' ? 3 : 1.5}
                dot={{ r: cohort === 'All' ? 4 : 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
