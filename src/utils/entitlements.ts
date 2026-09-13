/**
 * SENTINEL – Centralized Entitlements
 *
 * Single source of truth for what each subscription tier can do.
 * Screens should call these capability functions instead of checking
 * isPro / raw tier strings directly, so limits stay consistent everywhere
 * and don't drift out of sync across the app.
 *
 * No behavioral telemetry of any kind lives here — every check reads
 * purely local, on-device state (Trial/SecureStorage) already used
 * elsewhere in the app.
 */

import { Trial, SubscriptionTier } from './storage';
import { getAIUsageThisMonth } from './aiEngine';

export interface Entitlements {
  tier: SubscriptionTier;
  isPro: boolean;
  isEssential: boolean;
  isTrial: boolean;
  isExpired: boolean;
  maxCases: number;
  maxWatchTargets: number;
  aiAnalysesRemaining: number;
  aiAnalysesCap: number;
  // Entity Resolution, Image Forensics, all 4 report types, custom report
  // branding — Pro-exclusive. Trial gets these too (full Pro experience).
  hasAdvancedFeatures: boolean;
}

export async function getEntitlements(): Promise<Entitlements> {
  const tier = await Trial.getSubscriptionTier();
  const maxCases = await Trial.getMaxCases();
  const maxWatchTargets = await Trial.getMaxWatchTargets();
  const usage = await getAIUsageThisMonth();
  return {
    tier,
    isPro: tier === 'pro',
    isEssential: tier === 'essential',
    isTrial: tier === 'trial',
    isExpired: tier === 'expired',
    maxCases,
    maxWatchTargets,
    aiAnalysesRemaining: usage.remaining,
    aiAnalysesCap: usage.cap,
    hasAdvancedFeatures: tier === 'pro' || tier === 'trial',
  };
}

export async function canCreateNewCase(currentCaseCount: number): Promise<boolean> {
  const max = await Trial.getMaxCases();
  return currentCaseCount < max;
}

export async function canAddWatchTarget(currentTargetCount: number): Promise<boolean> {
  const max = await Trial.getMaxWatchTargets();
  return currentTargetCount < max;
}

export async function hasAdvancedFeatures(): Promise<boolean> {
  const tier = await Trial.getSubscriptionTier();
  return tier === 'pro' || tier === 'trial';
}
