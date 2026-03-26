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
export const C = {
  // Backgrounds
  bg:        '#070b12',
  surface:   '#0d1420',
  card:      '#0f1923',

  // Borders
  border:    '#1a2535',

  // Text
  text:      '#e8edf5',
  textMid:   '#8899b0',
  textDim:   '#ffffff',

  // Accent (cyan-blue)
  accent:    '#1a5fa8',
  accentDim: '#0a1f38',
  orange:    '#f47c20',
  orangeDim: '#2a1a08',

  // Status colors
  green:     '#2ecc71',
  greenDim:  '#0d2018',
  amber:     '#f39c12',
  amberDim:  '#1f1500',
  red:       '#e74c3c',
  redDim:    '#200a08',
  purple:    '#9b59b6',
  purpleDim: '#180d20',

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
