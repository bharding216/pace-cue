import { createAuthServerClient } from '@/lib/supabase-server-actions';
import { getOverviewStats, getSignupsOverTime, getEventsOverTime } from '@/lib/queries';
import StatCard from '@/components/StatCard';
import SignupsChart from '@/components/SignupsChart';
import EventsChart from '@/components/EventsChart';
import SignOutButton from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [stats, signups, events] = await Promise.all([
    getOverviewStats(),
    getSignupsOverTime(30),
    getEventsOverTime(30),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PaceCue Admin</h1>
          <p className="mt-1 text-sm text-gray-400">
            Signed in as {user?.email}
          </p>
        </div>
        <SignOutButton />
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard
          label="New Users"
          value={stats.newUsersLast7d}
          detail="Last 7 days"
        />
        <StatCard label="DAU" value={stats.dauToday} detail="Today" />
        <StatCard
          label="Pro Subscribers"
          value={stats.proSubscribers}
          detail="Active + trialing"
        />
        <StatCard
          label="AI Generations"
          value={stats.aiGenerationsLast7d}
          detail="Last 7 days"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SignupsChart data={signups} />
        <EventsChart data={events} />
      </section>
    </div>
  );
}
