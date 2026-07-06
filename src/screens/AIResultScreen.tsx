/**
 * SENTINEL – AI Analysis Screen
 *
 * Shared screen for displaying all four AI outputs:
 * – Search result analysis
 * – Case report generation
 * – Search strategy advice
 * – Notes summarization
 *
 * Features:
 * – Streaming-style reveal animation
 * – Copy to clipboard
 * – Share as text
 * – Save as field note
 * – Pro tier gate (shows upgrade prompt for Solo users)
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Share,
  Alert, Animated,
} from 'react-native';
import { C, IS_IPAD } from '../utils/theme';
import { getAIUsageThisMonth } from '../utils/aiEngine';

export type AIScreenMode =
  | 'analyze'
  | 'report'
  | 'strategy'
  | 'summarize';

interface Props {
  mode:        AIScreenMode;
  title:       string;
  onBack:      () => void;
  onSaveNote?: (text: string) => void;
  fetchResult: () => Promise<string>;  // caller provides the AI call
}

const MODE_ICONS: Record<AIScreenMode, string> = {
  analyze:  '🤖',
  report:   '📄',
  strategy: '🎯',
  summarize:'📋',
};

const MODE_LABELS: Record<AIScreenMode, string> = {
  analyze:  'AI Analysis',
  report:   'Case Report',
  strategy: 'Search Strategy',
  summarize:'Notes Summary',
};

export default function AIResultScreen({ mode, title, onBack, onSaveNote, fetchResult }: Props) {
  const [status,   setStatus]   = useState<'loading' | 'done' | 'error'>('loading');
  const [result,   setResult]   = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [usage,    setUsage]    = useState<{ count: number; cap: number; remaining: number } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setStatus('loading');
    try {
      const [text, usageData] = await Promise.all([
        fetchResult(),
        getAIUsageThisMonth(),
      ]);
      setResult(text);
      setUsage(usageData);
      setStatus('done');
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e: any) {
      setErrorMsg(e.message || 'Unknown error');
      setStatus('error');
    }
  };

  const handleCopy = () => {
    try {
      const { Clipboard } = require('react-native');
      Clipboard.setString(result);
    } catch {}
    Alert.alert('✓ Copied', 'AI analysis copied to clipboard.');
  };

  const handleShare = async () => {
    await Share.share({
      message: `SENTINEL – ${MODE_LABELS[mode]}\n${'─'.repeat(28)}\n${result}`,
      title:   `Sentinel ${MODE_LABELS[mode]}`,
    });
  };

  const handleSaveNote = () => {
    if (onSaveNote) {
      onSaveNote(`${MODE_ICONS[mode]} ${MODE_LABELS[mode]}:\n\n${result}`);
      Alert.alert('✓ Saved', 'AI analysis saved to Field Notes.');
    }
  };

  // ── Render sections ──────────────────────────────────────────────────────

  const renderResult = () => {
    // Split on === section headers
    const sections = result.split(/\n(===.+===)\n/g);
    return sections.map((section, i) => {
      if (section.startsWith('===') && section.endsWith('===')) {
        return (
          <View key={i} style={s.sectionHeader}>
            <Text style={s.sectionHeaderText}>
              {section.replace(/===/g, '').trim()}
            </Text>
          </View>
        );
      }
      // Split numbered lists and bullets for better rendering
      const lines = section.split('\n').filter(l => l.trim());
      return (
        <View key={i} style={s.sectionBody}>
          {lines.map((line, j) => {
            const isNumbered = /^\d+\./.test(line.trim());
            const isBullet   = /^[-•*]/.test(line.trim());
            const isHeader   = line.trim().endsWith(':') && line.trim().length < 50;
            return (
              <Text
                key={j}
                style={[
                  s.resultLine,
                  isNumbered && s.numberedLine,
                  isBullet   && s.bulletLine,
                  isHeader   && s.subHeader,
                ]}
              >
                {line}
              </Text>
            );
          })}
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.screenTitle}>{MODE_ICONS[mode]} {MODE_LABELS[mode]}</Text>
          <Text style={s.screenSub} numberOfLines={1}>{title}</Text>
        </View>
        {status === 'done' && (
          <TouchableOpacity onPress={load} style={s.retryBtn}>
            <Text style={s.retryText}>↻</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading */}
      {status === 'loading' && (
        <View style={s.centerBox}>
          <ActivityIndicator color={C.accent} size="large" />
          <Text style={s.loadingText}>Analyzing with Claude AI…</Text>
          <Text style={s.loadingSubText}>This takes 5–15 seconds</Text>
        </View>
      )}

      {/* Error */}
      {status === 'error' && (
        <View style={s.centerBox}>
          <Text style={s.errorEmoji}>⚠️</Text>
          <Text style={s.errorTitle}>Analysis Failed</Text>
          <Text style={s.errorMsg}>{errorMsg}</Text>
          {errorMsg.includes('API key') && (
            <View style={s.apiKeyHint}>
              <Text style={s.apiKeyHintText}>
                Add your Anthropic API key in:{'\n'}
                Home → 🔐 Security → AI Configuration
              </Text>
            </View>
          )}
          <TouchableOpacity style={s.retryBtnLarge} onPress={load}>
            <Text style={s.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.backBtnLarge} onPress={onBack}>
            <Text style={s.backBtnLargeText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Result */}
      {status === 'done' && (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            contentContainerStyle={[s.content, IS_IPAD && s.iPadContent]}
            showsVerticalScrollIndicator={false}
          >
            {/* Usage badge */}
            {usage && (
              <View style={s.usageBadge}>
                <Text style={s.usageText}>
                  AI queries this month: {usage.count}/{usage.cap}
                  {usage.remaining <= 10 && ` · ${usage.remaining} remaining`}
                </Text>
              </View>
            )}

            {/* AI result */}
            <View style={s.resultCard}>
              <View style={s.resultHeader}>
                <Text style={s.resultHeaderText}>
                  {MODE_ICONS[mode]} {MODE_LABELS[mode]}
                </Text>
                <View style={s.proBadge}>
                  <Text style={s.proBadgeText}>PRO</Text>
                </View>
              </View>
              <View style={s.resultBody}>
                {renderResult()}
              </View>
            </View>

            {/* Action buttons */}
            <View style={s.actions}>
              <TouchableOpacity style={[s.actionBtn, { borderColor: C.accent, backgroundColor: C.accentDim }]} onPress={handleCopy}>
                <Text style={[s.actionBtnText, { color: C.accent }]}>⎘ Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { borderColor: C.purple, backgroundColor: C.purpleDim }]} onPress={handleShare}>
                <Text style={[s.actionBtnText, { color: C.purple }]}>↑ Share</Text>
              </TouchableOpacity>
              {onSaveNote && (
                <TouchableOpacity style={[s.actionBtn, { borderColor: C.green, backgroundColor: C.greenDim }]} onPress={handleSaveNote}>
                  <Text style={[s.actionBtnText, { color: C.green }]}>📋 Save Note</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Regenerate */}
            <TouchableOpacity style={s.regenBtn} onPress={load}>
              <Text style={s.regenBtnText}>↻ Regenerate Analysis</Text>
            </TouchableOpacity>

            <Text style={s.disclaimer}>
              AI analysis is for investigative assistance only. Verify all findings independently before use in legal proceedings.
            </Text>

            <View style={{ height: 48 }} />
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ── Pro gate component (exported for use in other screens) ───────────────────

export function AIProGate({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <View style={s.proGate}>
      <Text style={s.proGateEmoji}>🤖</Text>
      <Text style={s.proGateTitle}>AI Analysis</Text>
      <Text style={s.proGateText}>
        AI-powered analysis is available on the Pro plan.
        Analyze results, generate client reports, get search strategies,
        and summarize field notes with Claude AI.
      </Text>
      <TouchableOpacity style={s.proGateBtn} onPress={onUpgrade}>
        <Text style={s.proGateBtnText}>Upgrade to Pro →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Strategy advisor input component ────────────────────────────────────────

export function StrategyInputCard({
  onSubmit,
}: {
  onSubmit: (subjectType: string, query: string, context: string) => void;
}) {
  const [subjectType, setSubjectType] = useState('Person');
  const [query,       setQuery]       = useState('');
  const [context,     setContext]     = useState('');

  const SUBJECT_TYPES = ['Person', 'Company', 'Vehicle', 'Phone', 'Email', 'Domain', 'IP Address', 'Location'];

  return (
    <View style={s.strategyCard}>
      <Text style={s.strategyTitle}>🎯 Search Strategy Advisor</Text>
      <Text style={s.strategyLabel}>Subject Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {SUBJECT_TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[s.typeChip, subjectType === t && s.typeChipActive]}
            onPress={() => setSubjectType(t)}
          >
            <Text style={[s.typeChipText, subjectType === t && s.typeChipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={s.strategyLabel}>Subject / Query</Text>
      <View style={s.strategyInput}>
        <Text style={s.strategyInputText} onPress={() => {}}>
          {query || 'e.g. John Smith, +1 555 000 0000, example.com…'}
        </Text>
      </View>
      <Text style={s.strategyLabel}>Investigation Goal (optional)</Text>
      <View style={[s.strategyInput, { minHeight: 60 }]}>
        <Text style={s.strategyInputText}>
          {context || 'e.g. Locate subject for process serving, verify employment history…'}
        </Text>
      </View>
      <TouchableOpacity
        style={[s.strategyBtn, !query.trim() && s.strategyBtnDisabled]}
        onPress={() => query.trim() && onSubmit(subjectType, query, context)}
        disabled={!query.trim()}
      >
        <Text style={s.strategyBtnText}>Get Strategy →</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.bg },
  topBar:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: IS_IPAD ? 16 : 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:      { marginRight: 10 },
  backText:     { color: C.accent, fontSize: 28, lineHeight: 28 },
  screenTitle:  { color: C.text, fontWeight: '700', fontSize: IS_IPAD ? 18 : 16 },
  screenSub:    { color: C.textDim, fontSize: IS_IPAD ? 13 : 11, marginTop: 2 },
  retryBtn:     { padding: 8 },
  retryText:    { color: C.accent, fontSize: 22 },
  centerBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText:  { color: C.text, fontSize: IS_IPAD ? 18 : 16, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  loadingSubText:{ color: C.textDim, fontSize: IS_IPAD ? 14 : 13 },
  errorEmoji:   { fontSize: 48, marginBottom: 16 },
  errorTitle:   { color: C.red, fontSize: IS_IPAD ? 22 : 18, fontWeight: '700', marginBottom: 10 },
  errorMsg:     { color: C.textMid, fontSize: IS_IPAD ? 15 : 14, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  apiKeyHint:   { backgroundColor: C.accentDim, borderRadius: 12, padding: 14, marginBottom: 20, width: '100%' },
  apiKeyHintText:{ color: C.accent, fontSize: IS_IPAD ? 14 : 13, textAlign: 'center', lineHeight: 20 },
  retryBtnLarge:{ backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12 },
  retryBtnText: { color: C.bg, fontWeight: '800', fontSize: IS_IPAD ? 16 : 15 },
  backBtnLarge: { padding: 12 },
  backBtnLargeText:{ color: C.textDim, fontSize: IS_IPAD ? 15 : 14 },
  content:      { padding: 16 },
  iPadContent:  { paddingHorizontal: 48, maxWidth: 760, alignSelf: 'center', width: '100%' },
  usageBadge:   { backgroundColor: C.card, borderRadius: 8, padding: 8, marginBottom: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  usageText:    { color: C.textDim, fontSize: IS_IPAD ? 12 : 11 },
  resultCard:   { backgroundColor: C.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: '#0a1018' },
  resultHeaderText:{ color: C.accent, fontWeight: '700', fontSize: IS_IPAD ? 15 : 13, letterSpacing: 0.5 },
  proBadge:     { backgroundColor: C.accentDim, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  proBadgeText: { color: C.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  resultBody:   { padding: 16 },
  sectionHeader:{ marginTop: 16, marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionHeaderText:{ color: C.accent, fontWeight: '700', fontSize: IS_IPAD ? 14 : 13, letterSpacing: 0.5 },
  sectionBody:  { marginBottom: 8 },
  resultLine:   { color: C.text, fontSize: IS_IPAD ? 15 : 14, lineHeight: IS_IPAD ? 24 : 22, marginBottom: 4 },
  numberedLine: { color: C.text, paddingLeft: 4 },
  bulletLine:   { color: C.textMid, paddingLeft: 8 },
  subHeader:    { color: C.accent, fontWeight: '600', marginTop: 8, marginBottom: 2 },
  actions:      { flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  actionBtn:    { flex: 1, minWidth: 90, borderRadius: 12, padding: IS_IPAD ? 14 : 12, alignItems: 'center', borderWidth: 1 },
  actionBtnText:{ fontWeight: '700', fontSize: IS_IPAD ? 14 : 13 },
  regenBtn:     { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  regenBtnText: { color: C.textMid, fontSize: IS_IPAD ? 14 : 13 },
  disclaimer:   { color: C.textDim, fontSize: IS_IPAD ? 12 : 11, textAlign: 'center', lineHeight: 17, paddingHorizontal: 8 },
  // Pro gate
  proGate:      { margin: 20, backgroundColor: C.card, borderRadius: 20, padding: IS_IPAD ? 32 : 24, alignItems: 'center', borderWidth: 1, borderColor: C.accentDim },
  proGateEmoji: { fontSize: 48, marginBottom: 14 },
  proGateTitle: { color: C.text, fontWeight: '800', fontSize: IS_IPAD ? 24 : 20, marginBottom: 12 },
  proGateText:  { color: C.textMid, fontSize: IS_IPAD ? 15 : 14, textAlign: 'center', lineHeight: IS_IPAD ? 24 : 22, marginBottom: 24 },
  proGateBtn:   { backgroundColor: C.accent, borderRadius: 14, paddingVertical: IS_IPAD ? 18 : 14, paddingHorizontal: IS_IPAD ? 40 : 28 },
  proGateBtnText:{ color: C.bg, fontWeight: '800', fontSize: IS_IPAD ? 17 : 15 },
  // Strategy
  strategyCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  strategyTitle:{ color: C.accent, fontWeight: '700', fontSize: IS_IPAD ? 17 : 15, marginBottom: 14 },
  strategyLabel:{ color: C.textDim, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  strategyInput:{ backgroundColor: C.bg, borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: C.border, minHeight: 44 },
  strategyInputText:{ color: C.textDim, fontSize: IS_IPAD ? 15 : 14 },
  strategyBtn:  { backgroundColor: C.accent, borderRadius: 12, padding: 14, alignItems: 'center' },
  strategyBtnDisabled:{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  strategyBtnText:{ color: C.bg, fontWeight: '800', fontSize: IS_IPAD ? 16 : 14 },
  typeChip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.bg, marginRight: 8, borderWidth: 1, borderColor: C.border },
  typeChipActive:{ backgroundColor: C.accentDim, borderColor: C.accent },
  typeChipText: { color: C.textDim, fontSize: IS_IPAD ? 13 : 12 },
  typeChipTextActive:{ color: C.accent, fontWeight: '700' },
});
