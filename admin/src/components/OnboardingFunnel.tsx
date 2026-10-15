import type { FunnelStep } from '@/lib/queries';

type Props = { data: FunnelStep[] };

export default function OnboardingFunnel({ data }: Props) {
  if (data.length === 0) return null;

  const maxCount = data[0]?.user_count ?? 1;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-gray-400">
          Onboarding Funnel
        </h2>
        <p className="text-xs text-gray-500">Last 30 days</p>
      </div>
      <p className="mb-4 text-xs text-gray-600">
        Unique devices progressing through each step
      </p>

      <div className="space-y-3">
        {data.map((step, i) => {
          const widthPct = maxCount > 0
            ? Math.max((step.user_count / maxCount) * 100, 2)
            : 0;

          const dropoff =
            i > 0 && data[i - 1].user_count > 0
              ? Math.round(
                  ((data[i - 1].user_count - step.user_count) /
                    data[i - 1].user_count) *
                    100,
                )
              : null;

          return (
            <div key={step.step}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="text-gray-300">{step.step}</span>
                <span className="tabular-nums text-gray-400">
                  {step.user_count.toLocaleString()}{' '}
                  <span className="text-gray-600">({step.pct}%)</span>
                  {dropoff !== null && dropoff > 0 && (
                    <span className="ml-1.5 text-red-400/70 text-xs">
                      −{dropoff}%
                    </span>
                  )}
                </span>
              </div>
              <div className="h-5 w-full rounded bg-gray-800">
                <div
                  className="flex h-5 items-center rounded bg-blue-600/30 px-2 text-[10px] tabular-nums text-blue-300"
                  style={{ width: `${widthPct}%` }}
                >
                  {step.pct}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
