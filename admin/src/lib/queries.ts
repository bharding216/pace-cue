import { createServiceClient } from './supabase-server';

export type OverviewStats = {
  totalUsers: number;
  newUsersLast7d: number;
  dauToday: number;
  proSubscribers: number;
  aiGenerationsLast7d: number;
};

export type DailyCount = {
  date: string;
  count: number;
};

/**
 * Fetch all overview metrics in parallel.
 */
export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = createServiceClient();

  const [
    totalUsersRes,
    newUsersRes,
    dauRes,
    proSubsRes,
    aiGensRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', daysAgo(7)),
    supabase.rpc('dau_today'),
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'pro')
      .in('status', ['active', 'trialing']),
    supabase
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', daysAgo(7)),
  ]);

  return {
    totalUsers: totalUsersRes.count ?? 0,
    newUsersLast7d: newUsersRes.count ?? 0,
    dauToday: (dauRes.data as number) ?? 0,
    proSubscribers: proSubsRes.count ?? 0,
    aiGenerationsLast7d: aiGensRes.count ?? 0,
  };
}

/**
 * Signups per day for the last N days.
 */
export async function getSignupsOverTime(days = 30): Promise<DailyCount[]> {
  const supabase = createServiceClient();

  const { data } = await supabase.rpc('signups_per_day', { num_days: days });
  return (data as DailyCount[]) ?? [];
}

/**
 * Event count per day for the last N days.
 */
export async function getEventsOverTime(days = 30): Promise<DailyCount[]> {
  const supabase = createServiceClient();

  const { data } = await supabase.rpc('events_per_day', { num_days: days });
  return (data as DailyCount[]) ?? [];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
