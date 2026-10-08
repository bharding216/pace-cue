/**
 * Subscription & AI usage context for PaceCue Pro.
 *
 * Uses RevenueCat for IAP management and Supabase for server-side
 * subscription state + AI usage tracking.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  EXTERNAL SETUP REQUIRED — see SETUP.md                │
 * │                                                        │
 * │  1. Create RevenueCat project + iOS/Android apps       │
 * │  2. Create subscription products in App Store Connect   │
 * │  3. Set EXPO_PUBLIC_REVENUE_CAT_KEY in .env            │
 * │  4. Create "pacecue_pro" entitlement in RevenueCat     │
 * │  5. Set up RevenueCat webhook → Supabase edge function │
 * └─────────────────────────────────────────────────────────┘
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Platform, Alert, Linking } from 'react-native';
import Purchases, {
  PurchasesPackage,
  PurchasesOfferings,
  LOG_LEVEL,
} from 'react-native-purchases';
import { useAuth } from './AuthContext';
import { supabase } from '../analytics/supabaseClient';
import {
  Subscription,
  SubscriptionTier,
  FREE_TIER_AI_WORKOUTS,
} from '../types/database';

// ┌─────────────────────────────────────────────────────────┐
// │  PLACEHOLDER: Set your RevenueCat public API key in     │
// │  .env as EXPO_PUBLIC_REVENUE_CAT_KEY                    │
// └─────────────────────────────────────────────────────────┘
const REVENUE_CAT_KEY = process.env.EXPO_PUBLIC_REVENUE_CAT_KEY ?? '';

const ENTITLEMENT_ID = 'pacecue_pro';

type SubscriptionContextType = {
  subscription: Subscription | null;
  tier: SubscriptionTier;
  aiWorkoutsUsed: number;
  aiWorkoutsLimit: number | null;
  canUseAI: boolean;
  loading: boolean;
  offerings: PurchasesOfferings | null;
  offeringsLoading: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ error: Error | null }>;
  restorePurchases: () => Promise<{ error: Error | null }>;
  refreshSubscription: () => Promise<void>;
  manageSubscription: () => void;
  incrementAIUsage: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined,
);

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [aiWorkoutsUsed, setAiWorkoutsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rcInitialized, setRcInitialized] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [offeringsLoading, setOfferingsLoading] = useState(true);

  // ─── Initialize RevenueCat ────────────────────────────────

  useEffect(() => {
    if (!REVENUE_CAT_KEY || rcInitialized) return;

    const initRC = async () => {
      try {
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }
        Purchases.configure({ apiKey: REVENUE_CAT_KEY });
        setRcInitialized(true);
      } catch (err) {
        console.warn('RevenueCat init failed:', err);
      }
    };

    initRC();
  }, [rcInitialized]);

  // ─── Identify user in RevenueCat ──────────────────────────

  useEffect(() => {
    if (!user || !rcInitialized) return;

    Purchases.logIn(user.id).catch((err) => {
      console.warn('RevenueCat logIn failed:', err);
    });

    return () => {
      Purchases.logOut().catch(() => {});
    };
  }, [user?.id, rcInitialized]);

  // ─── Load offerings ───────────────────────────────────────

  useEffect(() => {
    if (!rcInitialized) return;

    if (__DEV__) {
      setOfferingsLoading(false);
      return;
    }

    const loadOfferings = async () => {
      try {
        setOfferingsLoading(true);
        const off = await Purchases.getOfferings();
        setOfferings(off);
      } catch (err) {
        console.warn('Failed to load offerings:', err);
      } finally {
        setOfferingsLoading(false);
      }
    };

    loadOfferings();
  }, [rcInitialized]);

  // ─── Load subscription from Supabase ─────────────────────

  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setAiWorkoutsUsed(0);
      setLoading(false);
      return;
    }

    const [{ data: sub }, { data: profile }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('profiles')
        .select('ai_workouts_this_month')
        .eq('id', user.id)
        .single(),
    ]);

    setSubscription(sub);
    setAiWorkoutsUsed(profile?.ai_workouts_this_month ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  // ─── Derived state ────────────────────────────────────────

  const tier = getEffectiveTier(subscription);

  const aiWorkoutsLimit =
    tier === 'free' ? FREE_TIER_AI_WORKOUTS : null;

  const canUseAI =
    tier === 'pro' || aiWorkoutsUsed < FREE_TIER_AI_WORKOUTS;

  // ─── Purchase ─────────────────────────────────────────────

  const purchasePackage = async (
    pkg: PurchasesPackage,
  ): Promise<{ error: Error | null }> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        await refreshSubscription();
        return { error: null };
      }

      return {
        error: new Error(
          'Purchase completed but subscription wasn\'t activated. ' +
            'Please tap "Restore Purchases" or contact support.',
        ),
      };
    } catch (err: any) {
      if (err.userCancelled) {
        return { error: null };
      }
      return { error: err };
    }
  };

  // ─── Restore ──────────────────────────────────────────────

  const restorePurchases = async (): Promise<{ error: Error | null }> => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        await refreshSubscription();
        return { error: null };
      }
      return {
        error: new Error('No active PaceCue Pro subscription found.'),
      };
    } catch (err: any) {
      return { error: err };
    }
  };

  // ─── Manage subscription ──────────────────────────────────

  const manageSubscription = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL(
        'https://play.google.com/store/account/subscriptions',
      );
    }
  };

  // ─── Increment AI usage ───────────────────────────────────

  const incrementAIUsage = useCallback(async () => {
    if (!user) return;

    await supabase.rpc('increment_ai_workouts', {
      p_user_id: user.id,
    });

    setAiWorkoutsUsed((prev) => prev + 1);
  }, [user]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        tier,
        aiWorkoutsUsed,
        aiWorkoutsLimit,
        canUseAI,
        loading,
        offerings,
        offeringsLoading,
        purchasePackage,
        restorePurchases,
        refreshSubscription,
        manageSubscription,
        incrementAIUsage,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      'useSubscription must be used within a SubscriptionProvider',
    );
  }
  return context;
}

function getEffectiveTier(sub: Subscription | null): SubscriptionTier {
  if (!sub) return 'free';

  if (sub.tier === 'pro' && sub.status === 'active') return 'pro';

  if (
    sub.status === 'trialing' &&
    sub.trial_ends_at &&
    new Date(sub.trial_ends_at) > new Date()
  ) {
    return 'pro';
  }

  if (
    sub.status === 'canceled' &&
    sub.current_period_end &&
    new Date(sub.current_period_end) > new Date()
  ) {
    return 'pro';
  }

  return 'free';
}
