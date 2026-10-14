import { createAuthServerClient } from '@/lib/supabase-server-actions';
import {
  getOverviewStats,
  getEngagementStats,
  getDAUOverTime,
  getSignupsOverTime,
  getEventsOverTime,
  getTodaysEventsByUser,
  getAIGenerationsByUser,
} from '@/lib/queries';
import StatCard from '@/components/StatCard';
import DAUChart from '@/components/DAUChart';
import SignupsChart from '@/components/SignupsChart';
import EventsChart from '@/components/EventsChart';
import TodaysActivity from '@/components/TodaysActivity';
import AIUsageBreakdown from '@/components/AIUsageBreakdown';
import SignOutButton from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [stats, engagement, dau, signups, events, todaysUsers, aiUsers] = await Promise.all([
    getOverviewStats(),
    getEngagementStats(),
    getDAUOverTime(30),
    getSignupsOverTime(30),
    getEventsOverTime(30),
    getTodaysEventsByUser(),
    getAIGenerationsByUser(7),
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

      {/* ── Usage ─────────────────────────────────────────── */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Usage
      </h2>
      <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard
          label="New Users"
          value={stats.newUsersLast7d}
          detail="Last 7 days"
        />
        <StatCard label="DAU" value={stats.dauToday} detail="Unique devices today (UTC)" />
        <StatCard label="WAU" value={stats.wau} detail="Unique devices, rolling 7 days" />
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

      {/* ── Growth & Engagement ───────────────────────────── */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Growth &amp; Engagement
      </h2>
      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Activation Rate"
          value={engagement.activationRate}
          format="percent"
          detail="Signed up last 30d → completed a workout"
        />
        <StatCard
          label="Week 4 Retention"
          value={engagement.week4Retention}
          format="percent"
          detail="Signed up ~4 wks ago → active this week"
        />
        <StatCard
          label="Core Engagement"
          value={engagement.coreEngagementRate}
          format="percent"
          detail="WAU who started/completed a workout"
        />
        <StatCard
          label="Free → Paid"
          value={engagement.freeToPaidRate}
          format="percent"
          detail="Registered users with pro subscription"
        />
      </section>

      {/* ── Trends ────────────────────────────────────────── */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Trends
      </h2>
      <section className="mb-4">
        <DAUChart data={dau} />
      </section>
      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SignupsChart data={signups} />
        <EventsChart data={events} />
      </section>

      {/* ── Drilldowns ─────────────────────────────────────── */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Drilldowns
      </h2>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TodaysActivity data={todaysUsers} />
        <AIUsageBreakdown data={aiUsers} />
      </section>
    </div>
  );
}
