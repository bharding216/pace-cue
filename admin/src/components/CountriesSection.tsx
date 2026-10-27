import type { CountryCount } from '@/lib/queries';
import { countryLabel } from '@/lib/countryLabel';
import StatCard from '@/components/StatCard';
import CountryMap from '@/components/CountryMap';
import CountriesBreakdown from '@/components/CountriesBreakdown';

export default function CountriesSection({ data }: { data: CountryCount[] }) {
  const known = data.filter((row) => row.country !== 'unknown');
  const total = data.reduce((sum, row) => sum + row.user_count, 0);
  const knownDevices = known.reduce((sum, row) => sum + row.user_count, 0);
  const unknownDevices = total - knownDevices;
  const top = known[0];
  const topShare = top && total > 0 ? Math.round((top.user_count / total) * 100) : 0;
  const located = total > 0 ? Math.round((knownDevices / total) * 100) : 0;

  return (
    <section className="mb-8">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Countries
      </h2>
      <p className="mb-3 text-xs text-gray-500">
        Device region from the latest app open in the last 30 days. Each device is counted once.
      </p>
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Countries"
          value={known.length}
          detail="Distinct regions with a device"
        />
        <StatCard
          label="Top country"
          value={top ? top.user_count : '—'}
          detail={top ? `${countryLabel(top.country)} · ${topShare}% of devices` : 'No region reported yet'}
        />
        <StatCard
          label="Located"
          value={located}
          format="percent"
          detail={`${knownDevices.toLocaleString()} devices with a region`}
        />
        <StatCard
          label="Unknown"
          value={unknownDevices}
          detail="Latest open had no region"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CountryMap data={data} />
        </div>
        <div className="lg:col-span-2">
          <CountriesBreakdown data={data} />
        </div>
      </div>
    </section>
  );
}
