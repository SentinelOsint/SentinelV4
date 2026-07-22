/**
 * SENTINEL – Design System & Theme
 *
 * Dark tactical UI palette + layout constants.
 */

import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const IS_IPAD = Platform.OS === 'ios' && SCREEN_WIDTH >= 768;

// ── Grid layout ──────────────────────────────────────────────────────────────
export const GRID_PADDING = IS_IPAD ? 24 : 16;
export const GRID_GAP     = IS_IPAD ? 14 : 10;
const COLUMNS             = IS_IPAD ? 3 : 2;
export const CARD_WIDTH   = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

// ── Spacing ──────────────────────────────────────────────────────────────────
export const SPACE = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 40,
};

// ── Card Design Tokens ────────────────────────────────────────────────────────
// Use these for consistent card appearance across all screens
export const CARD = {
  radius:       12,   // standard card corner radius
  radiusSm:     8,    // small card / badge
  radiusLg:     14,   // large card (iPad primary)
  padding:      14,   // standard card padding
  paddingSm:    10,   // compact card padding
  paddingLg:    18,   // large card padding (iPad)
  borderWidth:  1,    // standard border
  borderColor:  '#1a2535', // same as C.border
};

// ── Typography Tokens ─────────────────────────────────────────────────────────
export const TYPE = {
  screenTitle:  { fontWeight: '700' as const, letterSpacing: 0 },
  sectionLabel: { fontWeight: '700' as const, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  sectionHead:  { fontWeight: '600' as const, letterSpacing: 0 },
  cardTitle:    { fontWeight: '700' as const, letterSpacing: 0 },
  body:         { fontWeight: '400' as const, lineHeight: 20 },
  bodySecond:   { fontWeight: '400' as const, lineHeight: 18 },
  metadata:     { fontWeight: '400' as const, letterSpacing: 0 },
  statusLabel:  { fontWeight: '700' as const, letterSpacing: 1 },
  techId:       { fontFamily: 'Courier' as const },
};

// ── Font sizes ───────────────────────────────────────────────────────────────
export const FONT = {
  xs:   IS_IPAD ? 11 : 10,
  sm:   IS_IPAD ? 13 : 12,
  md:   IS_IPAD ? 15 : 14,
  lg:   IS_IPAD ? 17 : 16,
  xl:   IS_IPAD ? 22 : 20,
  xxl:  IS_IPAD ? 30 : 26,
};

// ── Color palette ─────────────────────────────────────────────────────────────
// Semantic color system — CALM OPERATIONAL INTELLIGENCE
// Colors carry meaning. Do not use for decoration.
export const C = {
  // Backgrounds — dark graphite and navy foundation
  bg:        '#070b12',
  surface:   '#0d1420',
  card:      '#0f1923',

  // Borders
  border:    '#1a2535',

  // Text
  text:      '#e8edf5',
  textMid:   '#8899b0',
  textDim:   '#4a5568',

  // Blue — actions, recommendations, intelligence paths, neutral support
  accent:    '#2563eb',
  accentDim: '#0f1f3d',

  // Purple — Pre-Contact Brief and AI-Assisted Interpretation only
  purple:    '#7c3aed',
  purpleDim: '#150d2a',
  purpleMid: '#9b6dff',

  // Amber — uncertainty, possible association, contradiction, verification required
  amber:     '#d97706',
  amberDim:  '#1a1000',
  amberMid:  '#ff9f0a',

  // Red — meaningful potential risk indicator, authoritative alert
  // Never use as identity confirmation
  red:       '#dc2626',
  redDim:    '#1a0505',
  redMid:    '#ff453a',

  // Green — source-confirmed, user-confirmed, reviewed information
  // Never use as general "safe" signal
  green:     '#16a34a',
  greenDim:  '#051a0d',
  greenMid:  '#34c759',

  // Gray — neutral context, unavailable, not assessed, limitations
  gray:      '#4a5568',
  grayDim:   '#0f1218',
  grayMid:   '#6b7a99',

  // Orange — secondary accent, legacy support
  orange:    '#ea580c',
  orangeDim: '#1a0a00',

  // Map / special
  mapPin:    '#3b9eff',
};

// ── Status / Priority colors ──────────────────────────────────────────────────
export const STATUS_COLORS: Record<string, string> = {
  active:   C.green,
  pending:  C.amber,
  closed:   C.textDim,
  archived: C.textDim,
};

export const PRIORITY_COLORS: Record<string, string> = {
  high:   C.red,
  medium: C.amber,
  low:    C.green,
};

// ── Note tags ─────────────────────────────────────────────────────────────────
export const NOTE_TAGS = [
  'General',
  'Person',
  'Vehicle',
  'Location',
  'Financial',
  'Digital',
  'Legal',
  'Evidence',
  'Lead',
  'Follow-up',
];

// ── Case tags ─────────────────────────────────────────────────────────────────
export const CASE_TAGS = [
  'Skip Trace',
  'Due Diligence',
  'Fraud',
  'Corporate',
  'Surveillance',
  'Cyber',
  'Background',
  'Asset Search',
  'Missing Person',
  'Legal Support',
];
