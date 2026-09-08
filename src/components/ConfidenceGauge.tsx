/**
 * SENTINEL – Reusable Confidence Gauge
 *
 * A restrained, analytical segmented-bar gauge for qualitative confidence
 * levels (HIGH/MEDIUM/LOW/INSUFFICIENT). Never renders an invented
 * percentage — always driven by a real qualitative level already produced
 * by the AI/data model. Tap to reveal the real "Why this rating?" detail
 * (passed in as children by the caller, from actual Sentinel data).
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C, FONT, SPACE } from '../utils/theme';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

interface Props {
  label: string;
  level: ConfidenceLevel;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const LEVEL_CONFIG: Record<ConfidenceLevel, { color: string; segments: number }> = {
  HIGH:         { color: C.green, segments: 3 },
  MEDIUM:       { color: C.amber, segments: 2 },
  LOW:          { color: C.red,   segments: 1 },
  INSUFFICIENT: { color: C.gray,  segments: 0 },
};

export default function ConfidenceGauge({ label, level, expanded, onToggle, children }: Props) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.INSUFFICIENT;

  return (
    <View style={{ marginBottom: SPACE.md }}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <Text style={{ color: C.textDim, fontSize: FONT.xs, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>{label}</Text>
        <Text style={{ color: config.color, fontSize: FONT.xl, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 }}>{level}</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: i < config.segments ? config.color : C.border,
              }}
            />
          ))}
        </View>
        <Text style={{ color: C.accent, fontSize: FONT.xs, marginTop: 8 }}>
          {expanded ? '▲ Hide why this rating' : '▼ Why this rating?'}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <View style={{ backgroundColor: C.surface, borderRadius: 8, padding: SPACE.md, marginTop: 8, borderWidth: 1, borderColor: C.border }}>
          {children}
        </View>
      )}
    </View>
  );
}
