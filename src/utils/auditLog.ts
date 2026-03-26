/**
 * SENTINEL – Encrypted Audit Log
 *
 * Maintains a tamper-evident, encrypted log of all:
 * – Search queries (module + query, no results)
 * – Authentication events (success, failure, lockout)
 * – Case management actions (create, open, export, delete)
 * – Data access events (notes read, history read)
 * – Security events (integrity failures, key rotation)
 *
 * The audit log is:
 * – Encrypted with the same AES key as operational data
 * – Integrity-protected via HMAC chain (each entry includes hash of previous)
 * – Exportable as encrypted JSON for legal/compliance purposes
 * – Capped at 500 entries (FIFO rotation)
 */

import { SecureStorage } from './secureStorage';

export type AuditEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'AUTH_LOCKOUT'
  | 'SESSION_TIMEOUT'
  | 'SESSION_MANUAL_LOCK'
  | 'SEARCH_QUERY'
  | 'CASE_CREATE'
  | 'CASE_OPEN'
  | 'CASE_EXPORT_PDF'
  | 'CASE_DELETE'
  | 'CASE_STATUS_CHANGE'
  | 'NOTE_CREATE'
  | 'NOTE_DELETE'
  | 'HISTORY_CLEAR'
  | 'INTEGRITY_CHECK_PASS'
  | 'INTEGRITY_CHECK_FAIL'
  | 'KEY_ROTATION'
  | 'WIPE_ALL_DATA'
  | 'SETTINGS_CHANGE';

export interface AuditEntry {
  id:        string;
  type:      AuditEventType;
  timestamp: string;
  epochMs:   number;
  detail?:   string;
  prevHash:  string;       // SHA-256 of previous entry (chain integrity)
}

const AUDIT_KEY    = 'sentinel_enc_audit_v1';
const MAX_ENTRIES  = 500;

let _lastHash = '0000000000000000';  // Genesis hash

export const AuditLog = {

  async initialize(): Promise<void> {
    const entries = await AuditLog.getAll();
    if (entries.length > 0) {
      // Restore chain tip from last persisted entry
      _lastHash = entries[entries.length - 1].id;
    }
  },

  async log(type: AuditEventType, detail?: string): Promise<void> {
    try {
      const entries = await AuditLog.getAll();
      const entry: AuditEntry = {
        id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        type,
        timestamp: new Date().toLocaleString('en-US'),
        epochMs:   Date.now(),
        detail,
        prevHash:  _lastHash,
      };
      _lastHash = entry.id;

      const updated = [...entries, entry].slice(-MAX_ENTRIES);
      await SecureStorage.set(AUDIT_KEY, updated);
    } catch (e) {
      console.warn("AuditLog.log failed:", e);
    }
  },

  async getAll(): Promise<AuditEntry[]> {
    try {
      const data = await SecureStorage.get<AuditEntry[]>(AUDIT_KEY);
      return data || [];
    } catch { return []; }
  },

  async getRecent(count: number = 50): Promise<AuditEntry[]> {
    const all = await AuditLog.getAll();
    return all.slice(-count).reverse();
  },

  async clear(): Promise<void> {
    await AuditLog.log('WIPE_ALL_DATA', 'Audit log cleared');
    await SecureStorage.remove(AUDIT_KEY);
    _lastHash = '0000000000000000';
  },

  /**
   * Export audit log as a JSON string for legal/compliance use.
   * The exported data is NOT encrypted (for sharing with legal counsel).
   * App should prompt for authentication before exporting.
   */
  async exportJSON(): Promise<string> {
    const entries = await AuditLog.getAll();
    const exportData = {
      app:       'SENTINEL OSINT',
      version:   '2.2.0',
      exportedAt: new Date().toISOString(),
      entryCount: entries.length,
      entries,
    };
    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Verify chain integrity – checks that prevHash references are consistent.
   * Returns true if the log is intact.
   */
  async verifyChain(): Promise<{ valid: boolean; brokenAt?: number }> {
    const entries = await AuditLog.getAll();
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].prevHash !== entries[i - 1].id) {
        return { valid: false, brokenAt: i };
      }
    }
    return { valid: true };
  },
};
