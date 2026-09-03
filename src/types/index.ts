/**
 * SENTINEL – Shared TypeScript Types
 */

export type Screen =
  | 'home'
  | 'person'
  | 'phone'
  | 'email'
  | 'social'
  | 'ip'
  | 'domain'
  | 'company'
  | 'vehicle'
  | 'court'
  | 'geo'
  | 'geo_map'
  | 'image'
  | 'breach' | 'case_intake'
  | 'cases'
  | 'notes'
  | 'history'
  | 'timeline' | 'upgrade' | 'watchlist' | 'one_input' | 'settings';

export type OsintResultType = 'data' | 'link' | 'copy' | 'info' | 'warn';

export interface OsintResult {
  label: string;
  value: string;
  type: OsintResultType;
}

export interface HistoryItem {
  id: string;
  module: string;
  query: string;
  timestamp: string;
  caseId?: string;
}

export interface FieldNote {
  id: string;
  text: string;
  tag: string;
  timestamp: string;
  caseId?: string;
}

export interface PostContactUpdate {
  id: string;
  rawText: string;
  aiSummary: string;
  timestamp: string;
}

export interface CaseReport {
  id: string;
  title: string;
  description: string;
  subject: string;
  location: string;
  status: 'active' | 'pending' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  searches: HistoryItem[];
  notes: FieldNote[];
  postContactUpdates?: PostContactUpdate[];
  createdAt: string;
  updatedAt: string;
}
