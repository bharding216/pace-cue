type StatCardProps = {
  label: string;
  value: number | string;
  detail?: string;
};

export default function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {detail && (
        <p className="mt-1 text-xs text-gray-500">{detail}</p>
      )}
    </div>
  );
}
