/**
 * SENTINEL – Application Storage
 *
 * All data flows through SecureStorage (AES-256 + HMAC-SHA256).
 * This module is the single access point for:
 * – Cases
 * – History
 * – Notes
 * – Settings
 *
 * Keys are managed by expo-secure-store (iOS Keychain / Android Keystore).
 * Raw AsyncStorage never receives unencrypted data.
 */

import { SecureStorage } from './secureStorage';
import { AuditLog }      from './auditLog';
import { CaseReport, HistoryItem, FieldNote } from '../types';

// Storage keys (AsyncStorage holds encrypted blobs under these keys)
const K = {
  CASES:    'sentinel_enc_cases_v1',
  HISTORY:  'sentinel_enc_history_v1',
  NOTES:    'sentinel_enc_notes_v1',
  SETTINGS: 'sentinel_enc_settings_v1',
};

export const Storage = {

  // ── Cases ────────────────────────────────────────────────────────────────

  async getCases(): Promise<CaseReport[]> {
    try {
      return (await SecureStorage.get<CaseReport[]>(K.CASES)) ?? [];
    } catch { return []; }
  },

  async saveCases(cases: CaseReport[]): Promise<void> {
    try { await SecureStorage.set(K.CASES, cases); } catch {}
  },

  // ── History ──────────────────────────────────────────────────────────────

  async getHistory(): Promise<HistoryItem[]> {
    try {
      return (await SecureStorage.get<HistoryItem[]>(K.HISTORY)) ?? [];
    } catch { return []; }
  },

  async addHistory(item: HistoryItem): Promise<void> {
    try {
      const history = await Storage.getHistory();
      const updated = [item, ...history].slice(0, 200);
      await SecureStorage.set(K.HISTORY, updated);
      // Audit log: record module + query (no results logged)
      await AuditLog.log('SEARCH_QUERY', `${item.module}: ${item.query}`);
    } catch {}
  },

  async clearHistory(): Promise<void> {
    try {
      await SecureStorage.remove(K.HISTORY);
      await AuditLog.log('HISTORY_CLEAR');
    } catch {}
  },

  // ── Notes ────────────────────────────────────────────────────────────────

  async getNotes(): Promise<FieldNote[]> {
    try {
      return (await SecureStorage.get<FieldNote[]>(K.NOTES)) ?? [];
    } catch { return []; }
  },

  async saveNotes(notes: FieldNote[]): Promise<void> {
    try { await SecureStorage.set(K.NOTES, notes); } catch {}
  },

  // ── Settings ─────────────────────────────────────────────────────────────

  async getSettings(): Promise<Record<string, unknown>> {
    try {
      return (await SecureStorage.get<Record<string, unknown>>(K.SETTINGS)) ?? {};
    } catch { return {}; }
  },

  async saveSetting(key: string, value: unknown): Promise<void> {
    try {
      const settings = await Storage.getSettings();
      settings[key] = value;
      await SecureStorage.set(K.SETTINGS, settings);
    } catch {}
  },

  // ── Wipe ─────────────────────────────────────────────────────────────────

  /**
   * Wipe all application data from the device.
   * Does NOT remove keys from Secure Enclave (use rotateKeys() for that).
   */
  async wipeAll(): Promise<void> {
    await AuditLog.log('WIPE_ALL_DATA', 'User-initiated full wipe');
    await SecureStorage.wipeAll();
  },
};

// ── Trial & Subscription ─────────────────────────────────────────────────────
const TRIAL_KEY = 'sentinel_trial_v1';
const SUB_KEY   = 'sentinel_subscription_v1';

export type SubscriptionTier = 'trial' | 'solo' | 'pro' | 'expired';

export const Trial = {
  async initialize(): Promise<void> {
    const existing = await SecureStorage.get<string>(TRIAL_KEY);
    if (!existing) {
      await SecureStorage.set(TRIAL_KEY, new Date().toISOString());
      await AuditLog.log('SETTINGS_CHANGE', 'Trial started');
    }
  },

  async getStartDate(): Promise<Date | null> {
    const iso = await SecureStorage.get<string>(TRIAL_KEY);
    return iso ? new Date(iso) : null;
  },

  async getDaysRemaining(): Promise<number> {
    const start = await Trial.getStartDate();
    if (!start) return 14;
    const elapsed = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(7 - elapsed));
  },

  async isActive(): Promise<boolean> {
    const days = await Trial.getDaysRemaining();
    return days > 0;
  },

  async getSubscriptionTier(): Promise<SubscriptionTier> {
    const sub = await SecureStorage.get<string>(SUB_KEY);
    if (sub === 'solo') return 'solo';
    if (sub === 'pro')  return 'pro';
    const trialActive = await Trial.isActive();
    return trialActive ? 'trial' : 'expired';
  },

  async setSubscription(tier: 'solo' | 'pro'): Promise<void> {
    await SecureStorage.set(SUB_KEY, tier);
    await AuditLog.log('SETTINGS_CHANGE', `Subscription set: ${tier}`);
  },

  async getOneInputUsageToday(): Promise<number> {
    const key = `sentinel_oneinput_${new Date().toISOString().slice(0,10)}`;
    const count = await SecureStorage.get<number>(key);
    return count || 0;
  },

  async incrementOneInputUsage(): Promise<void> {
    const key = `sentinel_oneinput_${new Date().toISOString().slice(0,10)}`;
    const count = await Trial.getOneInputUsageToday();
    await SecureStorage.set(key, count + 1);
  },

  async canUseOneInput(): Promise<boolean> {
    const tier = await Trial.getSubscriptionTier();
    if (tier === 'solo' || tier === 'pro') return true;
    if (tier === 'expired') return false;
    const used = await Trial.getOneInputUsageToday();
    return used < 2;
  },

  async canUseAI(): Promise<boolean> {
    const tier = await Trial.getSubscriptionTier();
    return tier === 'pro';
  },

  async canExportPDF(): Promise<boolean> {
    const tier = await Trial.getSubscriptionTier();
    return tier === 'pro' || tier === 'solo';
  },

  async getMaxCases(): Promise<number> {
    const tier = await Trial.getSubscriptionTier();
    if (tier === 'pro' || tier === 'solo') return 999;
    if (tier === 'trial') return 1;
    return 0;
  },
};
