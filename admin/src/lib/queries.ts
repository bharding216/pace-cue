import { createServiceClient } from './supabase-server';

export type OverviewStats = {
  totalUsers: number;
  newUsersLast7d: number;
  dauToday: number;
  wau: number;
  proSubscribers: number;
  aiGenerationsLast7d: number;
};

export type EngagementStats = {
  activationRate: number;
  week4Retention: number;
  coreEngagementRate: number;
  freeToPaidRate: number;
};

export type DailyCount = {
  date: string;
  count: number;
};

/**
 * Fetch all overview metrics in parallel.
 * All queries use security-definer RPCs to bypass RLS reliably.
 */
export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = createServiceClient();

  const [
    totalUsersRes,
    newUsersRes,
    dauRes,
    wauRes,
    proSubsRes,
    aiGensRes,
  ] = await Promise.all([
    supabase.rpc('total_users'),
    supabase.rpc('new_users', { num_days: 7 }),
    supabase.rpc('dau_today'),
    supabase.rpc('wau'),
    supabase.rpc('pro_subscribers'),
    supabase.rpc('ai_generations_count', { num_days: 7 }),
  ]);

  return {
    totalUsers: (totalUsersRes.data as number) ?? 0,
    newUsersLast7d: (newUsersRes.data as number) ?? 0,
    dauToday: (dauRes.data as number) ?? 0,
    wau: (wauRes.data as number) ?? 0,
    proSubscribers: (proSubsRes.data as number) ?? 0,
    aiGenerationsLast7d: (aiGensRes.data as number) ?? 0,
  };
}

/**
 * Fetch engagement / conversion metrics.
 */
export async function getEngagementStats(): Promise<EngagementStats> {
  const supabase = createServiceClient();

  const [
    activationRes,
    retentionRes,
    engagementRes,
    conversionRes,
  ] = await Promise.all([
    supabase.rpc('activation_rate'),
    supabase.rpc('week4_retention'),
    supabase.rpc('core_engagement_rate'),
    supabase.rpc('free_to_paid_rate'),
  ]);

  return {
    activationRate: (activationRes.data as number) ?? 0,
    week4Retention: (retentionRes.data as number) ?? 0,
    coreEngagementRate: (engagementRes.data as number) ?? 0,
    freeToPaidRate: (conversionRes.data as number) ?? 0,
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
