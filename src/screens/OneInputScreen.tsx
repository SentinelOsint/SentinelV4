/**
 * SENTINEL — One-Input Intelligence Search Screen
 *
 * Solo: input detection + curated module links
 * Pro:  Solo + AI summary of all findings
 */

import React, { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView,
  StyleSheet, Linking, ActivityIndicator, Alert,
} from 'react-native';
import { C, SPACE, FONT } from '../utils/theme';
import { buildOneInputResult, OneInputResult, InputType } from '../utils/oneInputSearch';
import { analyzeResults, generatePreContactBrief, validateBrief, ValidationResult } from '../utils/aiEngine';
import { exportSearchPDF, exportInvestigationReport } from '../utils/pdfExport';
import { Storage } from '../utils/storage';

interface Props {
  isPro: boolean;
  onBack: () => void;
  onUpgrade: () => void;
}

const TYPE_COLORS: Record<InputType, string> = {
  person:  '#3498DB',
  phone:   '#27AE60',
  email:   '#E67E22',
  ip:      '#9B59B6',
  domain:  '#1ABC9C',
  unknown: '#7F8C8D',
  company: '#E67E22',
};

const TYPE_ICONS: Record<InputType, string> = {
  person:  '👤',
  phone:   '📞',
  email:   '✉️',
  ip:      '🌐',
  domain:  '🔗',
  unknown: '🔍',
  company: '🏢',
};

export default function OneInputScreen({ isPro, onBack, onUpgrade }: Props) {
  const [query, setQuery]           = useState('');
  const [result, setResult]         = useState<OneInputResult | null>(null);
  const [aiSummary, setAiSummary]   = useState<string>('');
  const [loadingAI, setLoadingAI]   = useState(false);
  const [searched, setSearched]     = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [riskData, setRiskData]       = useState<any>(null);
  const [briefHistory, setBriefHistory] = useState<Array<{version: number, timestamp: string, data: any}>>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showBriefHistory, setShowBriefHistory] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [confidence, setConfidence]     = useState<number>(0);
  const [displayScore, setDisplayScore]   = useState<number>(0);
  const [displayConf, setDisplayConf]     = useState<number>(0);
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);
  const sectionRefs = useRef<Record<string, number>>({});
  const registerSection = (key: string, y: number) => {
    sectionRefs.current[key] = y;
  };
  const scrollToSection = (key: string) => {
    const y = sectionRefs.current[key];
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y: y - 20, animated: true });
    }
  };
  const [isSearching, setIsSearching] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['identity', 'risk']));
  const [validatedFindings, setValidatedFindings] = useState<Record<string, 'confirmed' | 'rejected' | 'needs_review'>>({});
  const validateFinding = async (id: string, status: 'confirmed' | 'rejected' | 'needs_review') => {
    const next = { ...validatedFindings, [id]: status };
    setValidatedFindings(next);
    try {
      const key = `sentinel_validated_${result?.query?.replace(/\s+/g, '_').toLowerCase() || 'unknown'}`;
      await Storage.saveSetting(key, JSON.stringify(next));
    } catch {}
  };

  const loadValidatedFindings = async (query: string) => {
    try {
      const key = `sentinel_validated_${query.replace(/\s+/g, '_').toLowerCase()}`;
      const settings = await Storage.getSettings();
      const saved = settings[key] as string | undefined;
      if (saved) setValidatedFindings(JSON.parse(saved));
    } catch {}
  };
  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const [showTemplates, setShowTemplates] = useState(false);
  const [evidenceTags, setEvidenceTags] = useState<Record<string, string>>({});

  const handleEvidenceTag = (url: string, label: string) => {
    Alert.alert(
      'Tag as Evidence',
      `Tag "${label}" for your investigation:`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '🔴 Evidence', onPress: () => setEvidenceTags(t => ({ ...t, [url]: 'Evidence' })) },
        { text: '🟡 Lead',     onPress: () => setEvidenceTags(t => ({ ...t, [url]: 'Lead' })) },
        { text: '🟢 Verified', onPress: () => setEvidenceTags(t => ({ ...t, [url]: 'Verified' })) },
      ]
    );
  };

  const SEARCH_TEMPLATES = [
    {
      name: '🔍 Skip Trace',
      icon: '🔍',
      description: 'Locate a person',
      placeholder: 'Full Name\nCity, State (optional)\nPhone or Email (optional)',
    },
    {
      name: '🏢 Due Diligence',
      icon: '🏢',
      description: 'Investigate a company or individual',
      placeholder: 'Company Name or Full Name\nState or Province (optional)\nEIN or Domain (optional)',
    },
    {
      name: '📋 Background Check',
      icon: '📋',
      description: 'Full background investigation',
      placeholder: 'Full Name\nDate of Birth (optional)\nLast Known Address (optional)',
    },
  ];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setAiSummary('');
    setRiskData(null);
    setSearched(true);
    setConfidence(0);
    setIsSearching(true);

    // Phase 1: Fast detection (immediate)
    setLoadingPhase('Detecting input type…');
    const partialResult = await buildOneInputResult(query.trim(), false);
    setResult(partialResult);
    setLoadingPhase('Running intelligence checks…');

    // Phase 2: Full search with Pro features
    const fullResult = await buildOneInputResult(query.trim(), isPro);
    setResult(fullResult);

    // Calculate confidence score
    const totalLinks = fullResult.modules.reduce((acc, m) => acc + m.links.length, 0);
    const hasWanted = fullResult.modules.some(m => m.module.includes('WANTED'));
    const hasBreach = fullResult.modules.some(m => m.module.includes('BREACH'));
    const baseScore = Math.min(40 + totalLinks * 2, 85);
    const bonusScore = (hasWanted ? 10 : 0) + (hasBreach ? 5 : 0);
    setConfidence(Math.min(baseScore + bonusScore, 99));
    setLoadingPhase('');
    setIsSearching(false);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);

    // Auto case creation: FBI/Interpol match detected
    if (isPro) {
      const hasWantedMatch = fullResult.modules.some(m =>
        m.module.includes('WANTED') &&
        m.links.some(l => l.label.includes('MATCH') || l.label.includes('🚨'))
      );
      if (hasWantedMatch) {
        setTimeout(() => {
          Alert.alert(
            '🚨 Wanted Match Detected',
            'A FBI or Interpol match was found. Create a new case to document this investigation?',
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Create Case',
                onPress: async () => {
                  const newCase = {
                    id: Date.now().toString(),
                    title: `WANTED MATCH: ${query.trim()}`,
                    subject: query.trim(),
                    status: 'active' as const,
                    priority: 'high' as const,
                    createdAt: new Date().toLocaleString('en-US'),
                    updatedAt: new Date().toLocaleString('en-US'),
                    description: 'Auto-created: FBI/Interpol match detected via One-Input Search.',
                    tags: ['wanted', 'auto-created', 'high-priority'],
                    notes: [],
                    searches: [],
                    location: '',
                  };
                  const cases = await Storage.getCases();
                  await Storage.saveCases([newCase, ...cases]);
                  Alert.alert('✅ Case Created', `Case "${newCase.title}" created and marked high priority.`);
                },
              },
            ]
          );
        }, 500);
      }
    }
  };

  const handleSaveBriefToCase = async () => {
    if (!result || !riskData) return;
    try {
      const briefSummary = riskData.preContactOverview
        ? `Identity: ${riskData.preContactOverview.identityConfidence} | Status: ${riskData.preContactOverview.operationalRiskStatus?.replace(/_/g, ' ')} | ${riskData.preContactOverview.primaryFinding}`
        : 'Pre-Contact Intelligence Brief';

      const priority = riskData.preContactOverview?.operationalRiskStatus === 'ELEVATED_CAUTION' ||
                       riskData.preContactOverview?.operationalRiskStatus === 'MATERIAL_INDICATOR_CONFIRMED' ? 'high' :
                       riskData.preContactOverview?.operationalRiskStatus === 'REQUIRES_VERIFICATION' ||
                       riskData.preContactOverview?.operationalRiskStatus === 'REQUIRES_IDENTITY_VERIFICATION' ? 'medium' : 'low';

      const newCase = {
        id: Date.now().toString(),
        title: `Pre-Contact Brief: ${result.query}`,
        subject: result.query,
        status: 'active' as const,
        priority: priority as 'high' | 'medium' | 'low',
        createdAt: new Date().toLocaleString('en-US'),
        updatedAt: new Date().toLocaleString('en-US'),
        description: briefSummary,
        tags: ['pre-contact-brief', 'one-input-search'],
        notes: [{
          id: Date.now().toString(),
          text: `PRE-CONTACT INTELLIGENCE BRIEF\n\nQuery: ${result.query}\nGenerated: ${new Date().toLocaleString('en-US')}\n\nIdentity Confidence: ${riskData.preContactOverview?.identityConfidence || 'N/A'}\nOperational Status: ${riskData.preContactOverview?.operationalRiskStatus?.replace(/_/g, ' ') || 'N/A'}\n\nPrimary Finding:\n${riskData.preContactOverview?.primaryFinding || 'N/A'}\n\nImmediate Verification Required:\n${riskData.preContactOverview?.immediateVerificationRequirement || 'N/A'}`,
          tag: 'Intelligence Brief',
          createdAt: new Date().toLocaleString('en-US'),
          timestamp: new Date().toLocaleString('en-US'),
        }],
        searches: [{
          id: Date.now().toString() + '_search',
          module: 'One-Input Search',
          query: result.query,
          timestamp: new Date().toLocaleString('en-US'),
          resultCount: result.modules.reduce((acc: number, m: any) => acc + m.links.length, 0),
        }],
        location: '',
      };
      const cases = await Storage.getCases();
      await Storage.saveCases([newCase, ...cases]);
      Alert.alert('✅ Brief Saved', `Pre-Contact Brief for "${result.query}" saved to Cases.`, [{ text: 'OK' }]);
    } catch (e) {
      Alert.alert('Error', 'Could not save brief to case.');
    }
  };

  const handleExportPDF = async () => {
    if (!result) return;
    setExporting(true);
    try {
      const osintResults = result.modules.flatMap(m =>
        m.links.map(l => ({ label: l.label, value: l.url, type: 'link' as const }))
      );

      if (riskData) {
        // Full investigation report with Pre-Contact Brief
        await exportInvestigationReport({
          caseData: {
            id: Date.now().toString(),
            title: `One-Input Investigation: ${result.query}`,
            subject: result.query,
            status: 'active',
            priority: riskData.riskLevel === 'CRITICAL' || riskData.riskLevel === 'HIGH' ? 'high' : riskData.riskLevel === 'MEDIUM' ? 'medium' : 'low',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: [],
            searches: osintResults.map((r, i) => ({ id: `ois-${Date.now()}-${i}`, module: 'One-Input Search', query: result.query, results: [r], timestamp: new Date().toISOString() })),
            location: '',
            description: `Pre-Contact Brief · Identity: ${riskData.preContactOverview?.identityConfidence || 'UNKNOWN'} · Status: ${riskData.preContactOverview?.operationalRiskStatus?.replace(/_/g, ' ') || 'NOT DETERMINED'}`,
            tags: ['one-input', 'ai-analysis', result.inputType],
          },
          aiSummary: riskData.summary,
          keyFindings: [...(riskData.keyFindings || []), ...(riskData.redFlags || []).map((r: string) => `🚨 ${r}`), ...(riskData.contradictions || []).map((c: string) => `⚠️ ${c}`)],
        });
      } else {
        await exportSearchPDF('One-Input Search', result.query, osintResults);
      }
    } catch {
      Alert.alert('Error', 'PDF export failed.');
    }
    setExporting(false);
  };
  const handleAISummary = async () => {
    if (!result) return;
    setLoadingAI(true);
    setRiskData(null);
    try {
      const allFindings = result.modules.flatMap(m =>
        m.links.map(l => ({ label: `${m.module} — ${l.label}`, value: l.url, type: 'link' as const }))
      );
      const briefJson = await generatePreContactBrief(result.query, result.detectedAs, allFindings);
      const jsonMatch = briefJson.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      const parsed = JSON.parse(jsonMatch[0]);
      const validation = validateBrief(parsed);
      setValidationResult(validation);
      setRiskData(parsed);
      setAiSummary(parsed.confidenceAndLimitations?.disclaimer || '');
      setBriefHistory(prev => {
        const prevBrief = prev.length > 0 ? prev[prev.length - 1].data : null;
        const changes: string[] = [];
        if (prevBrief) {
          const prevStatus = prevBrief.preContactOverview?.operationalRiskStatus;
          const newStatus = parsed.preContactOverview?.operationalRiskStatus;
          if (prevStatus !== newStatus) changes.push(`Operational status: ${prevStatus?.replace(/_/g, ' ')} → ${newStatus?.replace(/_/g, ' ')}`);
          const prevConf = prevBrief.preContactOverview?.identityConfidence;
          const newConf = parsed.preContactOverview?.identityConfidence;
          if (prevConf !== newConf) changes.push(`Identity confidence: ${prevConf} → ${newConf}`);
          const prevRisk = prevBrief.potentialRiskIndicators?.length || 0;
          const newRisk = parsed.potentialRiskIndicators?.length || 0;
          if (prevRisk !== newRisk) changes.push(`Risk indicators: ${prevRisk} → ${newRisk}`);
          const prevGaps = prevBrief.informationGaps?.length || 0;
          const newGaps = parsed.informationGaps?.length || 0;
          if (prevGaps !== newGaps) changes.push(`Information gaps: ${prevGaps} → ${newGaps}`);
        }
        return [...prev, {
          version: prev.length + 1,
          timestamp: new Date().toLocaleString('en-US'),
          data: parsed,
          changes: changes.length > 0 ? changes : prevBrief ? ['No significant changes detected'] : ['Initial brief generated'],
        }];
      });
    } catch (e: any) {
      Alert.alert('AI Error', `Could not generate Pre-Contact Brief: ${e?.message || 'Unknown error'}`);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    if (confidence > 0) {
      let current = 0;
      const target = confidence;
      const step = Math.ceil(target / 20);
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        setDisplayConf(current);
        if (current >= target) clearInterval(timer);
      }, 40);
      return () => clearInterval(timer);
    }
  }, [confidence]);

  useEffect(() => {
    if (riskData?.riskScore) {
      let current = 0;
      const target = riskData.riskScore;
      const step = Math.ceil(target / 30);
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        setDisplayScore(current);
        if (current >= target) clearInterval(timer);
      }, 30);
      return () => clearInterval(timer);
    }
  }, [riskData]);

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open link')
    );
  };

  const typeColor = result ? TYPE_COLORS[result.inputType] : C.accent;
  const typeIcon  = result ? TYPE_ICONS[result.inputType]  : '🔍';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>One-Input Search</Text>
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>{isPro ? 'PRO' : 'SOLO'}</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Search box */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>Enter any identifier</Text>
          <Text style={styles.searchHint}>
            Name · Phone · Email · IP Address · Domain
          </Text>
          <TextInput
            style={[styles.input, { minHeight: 50, maxHeight: 100, textAlignVertical: 'top' }]}
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. John Smith / +1 555 123 4567 / user@example.com"
            placeholderTextColor={C.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            numberOfLines={2}
          />
          {/* Search Templates */}
          <TouchableOpacity
            style={styles.templateToggle}
            onPress={() => setShowTemplates(!showTemplates)}
          >
            <Text style={styles.templateToggleText}>
              {showTemplates ? '▼ Hide Templates' : '▶ Use Search Template'}
            </Text>
          </TouchableOpacity>
          {showTemplates && (
            <View style={styles.templateList}>
              {SEARCH_TEMPLATES.map((t, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.templateChip}
                  onPress={() => {
                    setQuery(t.placeholder);
                    setShowTemplates(false);
                  }}
                >
                  <Text style={styles.templateChipName}>{t.name}</Text>
                  <Text style={styles.templateChipDesc}>{t.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={styles.multiInputHint}>💡 Tip: Enter multiple identifiers on separate lines for cross-referenced results</Text>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>🔍  Search</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {searched && result && (
          <>
            {/* Detected type badge */}
            {/* Loading phase indicator */}
            {loadingPhase ? (
              <View style={styles.loadingPhaseBox}>
                <ActivityIndicator color={C.accent} size="small" />
                <Text style={styles.loadingPhaseTxt}>{loadingPhase}</Text>
              </View>
            ) : null}
            <View style={[styles.typeBadge, { backgroundColor: typeColor + '20', borderColor: typeColor }]}>
              <Text style={styles.typeBadgeIcon}>{typeIcon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#6b7a99', fontSize: 9, fontWeight: '600', letterSpacing: 1, marginBottom: 2 }}>DETECTED TARGET</Text>
                <Text style={[styles.typeBadgeLabel, { color: typeColor }]}>
                  {result.detectedAs}
                </Text>
                <Text style={styles.typeBadgeQuery}>"{result.query}"</Text>
              </View>
              {confidence > 0 && (
                <View style={styles.confidenceBox}>
                  <Text style={styles.confidenceNum}>{displayConf}%</Text>
                  <Text style={styles.confidenceLbl}>confidence</Text>
                </View>
              )}
            </View>

            {/* AI Summary — Pro only */}
            {isPro && (
              <View style={styles.aiCard}>
                <View style={styles.aiCardHeader}>
                  <Text style={styles.aiCardTitle}>📋 Pre-Contact Intelligence Brief</Text>
                  {riskData && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginHorizontal: -4 }}>
                      {[
                        { key: 'overview', label: 'Overview' },
                        { key: 'identity', label: 'Identity' },
                        { key: 'risk', label: 'Risk' },
                        { key: 'contra', label: 'Contradictions' },
                        { key: 'gaps', label: 'Gaps' },
                        { key: 'checks', label: 'Checks' },
                        { key: 'ai_interp', label: 'AI Analysis' },
                      ].map((s) => (
                        <TouchableOpacity
                          key={s.key}
                          style={{ backgroundColor: '#0a0f1a', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 4, borderWidth: 1, borderColor: expandedSections.has(s.key) ? '#4a9eff' : '#1e2a3a' }}
                          onPress={() => {
                            if (!expandedSections.has(s.key)) {
                              setExpandedSections(prev => new Set([...prev, s.key]));
                            }
                            scrollToSection(s.key);
                          }}
                        >
                          <Text style={{ color: expandedSections.has(s.key) ? '#4a9eff' : '#6b7a99', fontSize: 11, fontWeight: '600' }}>{s.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                </View>
                {riskData ? (
                  <View>
                    {/* Validation Warnings */}
                    {validationResult && (validationResult.warnings.length > 0 || validationResult.errors.length > 0) && (
                      <View style={{ backgroundColor: '#0a0a0f', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: validationResult.errors.length > 0 ? '#dc262640' : '#d9770640' }}>
                        <Text style={{ color: validationResult.errors.length > 0 ? '#ff453a' : '#ff9f0a', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 }}>
                          {validationResult.errors.length > 0 ? '⚠️ BRIEF VALIDATION ERRORS' : '⚠️ BRIEF VALIDATION WARNINGS'}
                        </Text>
                        {validationResult.errors.map((e, i) => (
                          <Text key={i} style={{ color: '#ff453a', fontSize: 10, lineHeight: 15, marginBottom: 3 }}>● {e}</Text>
                        ))}
                        {validationResult.warnings.map((w, i) => (
                          <Text key={i} style={{ color: '#ff9f0a', fontSize: 10, lineHeight: 15, marginBottom: 3 }}>△ {w}</Text>
                        ))}
                      </View>
                    )}

                    {/* Pre-Contact Overview */}
                    {riskData.preContactOverview && (() => {
                      const ov = riskData.preContactOverview;
                      const statusColors: Record<string, string> = {
                        'LOW_INDICATED_RISK': '#30d158',
                        'REQUIRES_VERIFICATION': '#ffcc00',
                        'REQUIRES_IDENTITY_VERIFICATION': '#ff9500',
                        'ELEVATED_CAUTION': '#ff3b30',
                        'NOT_DETERMINED': '#8e8e93',
                        'INSUFFICIENT_IDENTIFIERS': '#8e8e93',
                      };
                      const confColors: Record<string, string> = {
                        'HIGH': '#30d158', 'MEDIUM': '#ffcc00', 'LOW': '#ff9500', 'INSUFFICIENT': '#ff3b30'
                      };
                      const statusColor = statusColors[ov.operationalRiskStatus] || '#8e8e93';
                      const confColor = confColors[ov.identityConfidence] || '#8e8e93';
                      return (
                        <View style={{ backgroundColor: '#0a0f1a', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1e3a5f' }}>
                          <Text style={{ color: '#4a9eff', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>PRE-CONTACT OVERVIEW</Text>
                          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                            <View style={{ flex: 1, backgroundColor: confColor + '15', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: confColor + '40' }}>
                              <Text style={{ color: '#8e8e93', fontSize: 9, fontWeight: '600', letterSpacing: 1, marginBottom: 4 }}>IDENTITY CONFIDENCE</Text>
                              <Text style={{ color: confColor, fontSize: 14, fontWeight: '800' }}>{ov.identityConfidence}</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: statusColor + '15', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: statusColor + '40' }}>
                              <Text style={{ color: '#8e8e93', fontSize: 9, fontWeight: '600', letterSpacing: 1, marginBottom: 4 }}>OPERATIONAL STATUS</Text>
                              <Text style={{ color: statusColor, fontSize: 11, fontWeight: '800' }}>{ov.operationalRiskStatus?.replace(/_/g, ' ')}</Text>
                            </View>
                          </View>
                          <View style={{ marginBottom: 10 }}>
                            <Text style={{ color: '#8e8e93', fontSize: 9, fontWeight: '600', letterSpacing: 1, marginBottom: 4 }}>PRIMARY FINDING</Text>
                            <Text style={{ color: '#e8eaf0', fontSize: 13, lineHeight: 19 }}>{ov.primaryFinding}</Text>
                          </View>
                          <View style={{ backgroundColor: '#ff950015', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#ff950040' }}>
                            <Text style={{ color: '#8e8e93', fontSize: 9, fontWeight: '600', letterSpacing: 1, marginBottom: 4 }}>IMMEDIATE VERIFICATION REQUIRED</Text>
                            <Text style={{ color: '#ff9500', fontSize: 12, lineHeight: 18 }}>{ov.immediateVerificationRequirement}</Text>
                          </View>
                          {/* Research Readiness */}
                          {ov.researchReadiness && (
                            <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#1e3a5f', paddingTop: 10 }}>
                              <Text style={{ color: '#4a9eff', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 }}>RESEARCH READINESS</Text>
                              {[
                                { label: 'Identity Verification', key: 'identityVerification' },
                                { label: 'Risk Screening', key: 'riskScreening' },
                                { label: 'Public Records', key: 'publicRecords' },
                                { label: 'Contradiction Review', key: 'contradictionReview' },
                              ].map((item) => {
                                const val = ov.researchReadiness[item.key];
                                const color = val === 'COMPLETE' ? '#34c759' : val === 'PARTIALLY_COMPLETE' ? '#ff9f0a' : val === 'NOT_APPLICABLE' ? '#4a5568' : '#ff453a';
                                return (
                                  <View key={item.key} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ color: '#6b7a99', fontSize: 10 }}>{item.label}</Text>
                                    <Text style={{ color, fontSize: 10, fontWeight: '600' }}>{val?.replace(/_/g, ' ') || 'NOT ASSESSED'}</Text>
                                  </View>
                                );
                              })}
                              <View style={{ marginTop: 6, backgroundColor: '#0a0f1a', borderRadius: 6, padding: 8 }}>
                                <Text style={{ color: '#6b7a99', fontSize: 9, fontWeight: '600', letterSpacing: 1, marginBottom: 2 }}>PRE-CONTACT READINESS</Text>
                                <Text style={{ color: ov.researchReadiness.preContactReadiness === 'READY' ? '#34c759' : '#ff9f0a', fontSize: 11, fontWeight: '700' }}>
                                  {ov.researchReadiness.preContactReadiness?.replace(/_/g, ' ') || 'NOT DETERMINED'}
                                </Text>
                              </View>
                            </View>
                          )}
                          <Text style={{ color: '#4a5568', fontSize: 10, marginTop: 10, fontStyle: 'italic' }}>This status reflects available evidence and does not confirm that contact is safe.</Text>
                        </View>
                      );
                    })()}
                    {/* Identity Confidence */}
                    {riskData.identityConfidence && (
                      <View style={styles.riskSection} onLayout={(e) => registerSection('identity', e.nativeEvent.layout.y)}>
                        <TouchableOpacity onPress={() => toggleSection('identity')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.riskSectionTitle}>🪪 IDENTITY CONFIDENCE</Text>
                          <Text style={{ color: '#4a5568', fontSize: 12 }}>{expandedSections.has('identity') ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {expandedSections.has('identity') && (
                          <>
                            <Text style={[styles.riskBulletGreen, {
                              color: riskData.identityConfidence.level === 'HIGH' ? '#30d158' :
                                     riskData.identityConfidence.level === 'MEDIUM' ? '#ffcc00' :
                                     riskData.identityConfidence.level === 'LOW' ? '#ff9500' : '#ff3b30'
                            }]}>◆ {riskData.identityConfidence.level} — {riskData.identityConfidence.basis}</Text>
                            {riskData.identityConfidence.uncertainties?.map((u: string, i: number) => (
                              <Text key={i} style={styles.riskBulletAmber}>△ {u}</Text>
                            ))}
                          </>
                        )}
                      </View>
                    )}
                    {/* Known Information */}
                    {riskData.knownInformation?.length > 0 && (
                      <View style={styles.riskSection}>
                        <TouchableOpacity onPress={() => toggleSection('known')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.riskSectionTitle}>✅ KNOWN INFORMATION ({riskData.knownInformation.length})</Text>
                          <Text style={{ color: '#4a5568', fontSize: 12 }}>{expandedSections.has('known') ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {expandedSections.has('known') && riskData.knownInformation.map((k: any, i: number) => {
                          const findingId = `known_${i}`;
                          const validation = validatedFindings[findingId];
                          return (
                            <View key={i} style={{ backgroundColor: validation === 'confirmed' ? '#0a1a0a' : validation === 'rejected' ? '#1a0a0a' : '#0a0f1a', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: validation === 'confirmed' ? '#34c759' : validation === 'rejected' ? '#ff453a' : '#34c75940' }}>
                              <Text style={{ color: '#6b7a99', fontSize: 9, fontWeight: '600', letterSpacing: 1, marginBottom: 4 }}>{k.confidence} · {k.source}</Text>
                              <Text style={{ color: '#e8eaf0', fontSize: 12, lineHeight: 18, marginBottom: 8 }}>{k.finding}</Text>
                              <View style={{ flexDirection: 'row', gap: 6 }}>
                                <TouchableOpacity
                                  style={{ flex: 1, backgroundColor: validation === 'confirmed' ? '#34c75930' : '#1a2a1a', borderRadius: 6, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: validation === 'confirmed' ? '#34c759' : '#34c75940' }}
                                  onPress={() => validateFinding(findingId, validation === 'confirmed' ? 'needs_review' : 'confirmed')}
                                >
                                  <Text style={{ color: '#34c759', fontSize: 10, fontWeight: '600' }}>✓ Confirm</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={{ flex: 1, backgroundColor: validation === 'needs_review' ? '#2a2a1a' : '#1a1a0a', borderRadius: 6, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: '#ff9f0a40' }}
                                  onPress={() => validateFinding(findingId, 'needs_review')}
                                >
                                  <Text style={{ color: '#ff9f0a', fontSize: 10, fontWeight: '600' }}>? Review</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={{ flex: 1, backgroundColor: validation === 'rejected' ? '#2a0a0a' : '#1a0a0a', borderRadius: 6, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: '#ff453a40' }}
                                  onPress={() => validateFinding(findingId, validation === 'rejected' ? 'needs_review' : 'rejected')}
                                >
                                  <Text style={{ color: '#ff453a', fontSize: 10, fontWeight: '600' }}>✕ Reject</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    {/* Confirmed and Supported Information */}
                    {riskData.confirmedAndSupportedInformation?.length > 0 && (
                      <View style={styles.riskSection}>
                        <TouchableOpacity onPress={() => toggleSection('confirmed')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.riskSectionTitle}>✅ CONFIRMED & SUPPORTED ({riskData.confirmedAndSupportedInformation.length})</Text>
                          <Text style={{ color: '#4a5568', fontSize: 12 }}>{expandedSections.has('confirmed') ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {expandedSections.has('confirmed') && riskData.confirmedAndSupportedInformation.map((item: any, i: number) => (
                          <View key={i} style={{ backgroundColor: '#051a0d', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#34c759' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ color: '#34c759', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>{item.confidence}</Text>
                              <Text style={{ color: '#4a5568', fontSize: 9 }}>{item.source}</Text>
                            </View>
                            <Text style={{ color: '#e8eaf0', fontSize: 12, lineHeight: 18, marginBottom: 4 }}>{item.statement}</Text>
                            {item.whyItMatters && (
                              <Text style={{ color: '#6b7a99', fontSize: 10, lineHeight: 15, fontStyle: 'italic' }}>→ {item.whyItMatters}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Possible Associations */}
                    {riskData.possibleAssociations?.length > 0 && (
                      <View style={styles.riskSection}>
                        <TouchableOpacity onPress={() => toggleSection('associations')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.riskSectionTitle}>🔗 POSSIBLE ASSOCIATIONS ({riskData.possibleAssociations.length})</Text>
                          <Text style={{ color: '#4a5568', fontSize: 12 }}>{expandedSections.has('associations') ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {expandedSections.has('associations') && riskData.possibleAssociations.map((item: any, i: number) => (
                          <View key={i} style={{ backgroundColor: '#1a1000', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#d97706' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ color: '#d97706', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>POSSIBLE ASSOCIATION — {item.confidence}</Text>
                            </View>
                            <Text style={{ color: '#e8eaf0', fontSize: 12, lineHeight: 18, marginBottom: 6 }}>{item.statement}</Text>
                            {item.whyIdentified && (
                              <Text style={{ color: '#6b7a99', fontSize: 10, lineHeight: 15, marginBottom: 4 }}>Why identified: {item.whyIdentified}</Text>
                            )}
                            {item.alternativeExplanation && (
                              <Text style={{ color: '#6b7a99', fontSize: 10, lineHeight: 15, marginBottom: 4 }}>◇ Alternative: {item.alternativeExplanation}</Text>
                            )}
                            {item.recommendedVerification && (
                              <Text style={{ color: '#4a9eff', fontSize: 10, lineHeight: 15 }}>→ {item.recommendedVerification}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Potential Risk Indicators */}
                    {riskData.potentialRiskIndicators?.length > 0 && (
                      <View style={styles.riskSection} onLayout={(e) => registerSection('risk', e.nativeEvent.layout.y)}>
                        <TouchableOpacity onPress={() => toggleSection('risk')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.riskSectionTitle}>🚨 POTENTIAL RISK INDICATORS ({riskData.potentialRiskIndicators.length})</Text>
                          <Text style={{ color: '#4a5568', fontSize: 12 }}>{expandedSections.has('risk') ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {expandedSections.has('risk') && riskData.potentialRiskIndicators.map((r: any, i: number) => (
                          <View key={i} style={{ backgroundColor: r.severity === 'HIGH' ? '#1a0505' : r.severity === 'MEDIUM' ? '#1a1000' : '#0a0f1a', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: r.severity === 'HIGH' ? '#ff453a' : r.severity === 'MEDIUM' ? '#ff9f0a' : '#4a9eff' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ color: r.severity === 'HIGH' ? '#ff453a' : r.severity === 'MEDIUM' ? '#ff9f0a' : '#4a9eff', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>
                                {r.severity} SEVERITY — {r.status}
                              </Text>
                              {r.identityRelevance && (
                                <Text style={{ color: '#4a5568', fontSize: 8, fontWeight: '600' }}>{r.identityRelevance?.replace(/_/g, ' ')}</Text>
                              )}
                            </View>
                            <Text style={{ color: '#e8eaf0', fontSize: 12, lineHeight: 18, marginBottom: 6 }}>{r.indicator}</Text>
                            {r.evidentiaryBasis && (
                              <Text style={{ color: '#6b7a99', fontSize: 10, lineHeight: 15, marginBottom: 4 }}>Basis: {r.evidentiaryBasis}</Text>
                            )}
                            {r.alternativeExplanation && (
                              <Text style={{ color: '#6b7a99', fontSize: 10, lineHeight: 15, marginBottom: 4 }}>◇ Alternative: {r.alternativeExplanation}</Text>
                            )}
                            {r.sourceReferences?.length > 0 && (
                              <Text style={{ color: '#4a5568', fontSize: 9, marginTop: 4 }}>Sources: {r.sourceReferences.join(' · ')}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                    {/* Contradictions */}
                    {riskData.contradictionsAndInconsistencies?.length > 0 && (
                      <View style={styles.riskSection} onLayout={(e) => registerSection('contra', e.nativeEvent.layout.y)}>
                        <TouchableOpacity onPress={() => toggleSection('contra')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.riskSectionTitle}>⚠️ CONTRADICTIONS ({riskData.contradictionsAndInconsistencies.length})</Text>
                          <Text style={{ color: '#4a5568', fontSize: 12 }}>{expandedSections.has('contra') ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {expandedSections.has('contra') && riskData.contradictionsAndInconsistencies.map((c: any, i: number) => (
                          <View key={i} style={{ backgroundColor: '#1a1000', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#d97706' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ color: '#d97706', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>CONTRADICTION — {c.significance}</Text>
                            </View>
                            <Text style={{ color: '#e8eaf0', fontSize: 12, lineHeight: 18, marginBottom: 6 }}>{c.description}</Text>
                            {c.sources?.length > 0 && (
                              <Text style={{ color: '#6b7a99', fontSize: 10, marginBottom: 4 }}>Sources: {c.sources.join(' vs ')}</Text>
                            )}
                            {c.recommendedResolution && (
                              <Text style={{ color: '#4a9eff', fontSize: 10, lineHeight: 15 }}>→ Resolution: {c.recommendedResolution}</Text>
                            )}
                            {c.affectedFindings?.length > 0 && (
                              <Text style={{ color: '#4a5568', fontSize: 9, marginTop: 4 }}>Affects: {c.affectedFindings.join(', ')}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                    {/* Information Gaps */}
                    {riskData.informationGaps?.length > 0 && (
                      <View style={styles.riskSection} onLayout={(e) => registerSection('gaps', e.nativeEvent.layout.y)}>
                        <TouchableOpacity onPress={() => toggleSection('gaps')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.riskSectionTitle}>🔍 INFORMATION GAPS ({riskData.informationGaps.length})</Text>
                          <Text style={{ color: '#4a5568', fontSize: 12 }}>{expandedSections.has('gaps') ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {expandedSections.has('gaps') && riskData.informationGaps.map((g: any, i: number) => (
                          <View key={i} style={{ backgroundColor: '#0a0f1a', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: g.importance === 'HIGH' ? '#ff453a' : g.importance === 'MEDIUM' ? '#ff9f0a' : '#4a9eff' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ color: '#6b7a99', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>INFORMATION GAP — {g.importance}</Text>
                            </View>
                            <Text style={{ color: '#e8eaf0', fontSize: 12, lineHeight: 18, marginBottom: 6 }}>{g.gap}</Text>
                            {g.suggestedCheck && (
                              <Text style={{ color: '#6b7a99', fontSize: 11, lineHeight: 16, marginBottom: 8, fontStyle: 'italic' }}>→ {g.suggestedCheck}</Text>
                            )}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                              <TouchableOpacity
                                style={{ backgroundColor: '#1a2a3a', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#4a9eff40' }}
                                onPress={() => Alert.alert('Add Identifier', 'Add a new identifier (DOB, address, phone) to refine this search.')}
                              >
                                <Text style={{ color: '#4a9eff', fontSize: 10, fontWeight: '600' }}>+ Add Identifier</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={{ backgroundColor: '#1a2a3a', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#4a9eff40' }}
                                onPress={() => Alert.alert('Field Note', 'Mark this gap as a follow-up task in Field Notes.')}
                              >
                                <Text style={{ color: '#4a9eff', fontSize: 10, fontWeight: '600' }}>📋 Create Task</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={{ backgroundColor: '#1a2a3a', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#4a556840' }}
                                onPress={() => Alert.alert('Mark Unavailable', 'This information gap will be marked as unavailable in the brief.')}
                              >
                                <Text style={{ color: '#4a5568', fontSize: 10, fontWeight: '600' }}>Mark Unavailable</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                    {/* Recommended Checks */}
                    {riskData.recommendedChecksBeforeContact?.length > 0 && (
                      <View style={styles.riskSection} onLayout={(e) => registerSection('checks', e.nativeEvent.layout.y)}>
                        <TouchableOpacity onPress={() => toggleSection('checks')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.riskSectionTitle}>📋 RECOMMENDED CHECKS ({riskData.recommendedChecksBeforeContact.length})</Text>
                          <Text style={{ color: '#4a5568', fontSize: 12 }}>{expandedSections.has('checks') ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {expandedSections.has('checks') && riskData.recommendedChecksBeforeContact.map((c: any, i: number) => (
                          <Text key={i} style={styles.riskBulletBlue}>→ [{c.priority}] {c.module} — {c.reason}</Text>
                        ))}
                      </View>
                    )}
                    {/* Operational Considerations */}
                    {riskData.operationalConsiderations?.length > 0 && (
                      <View style={styles.riskSection}>
                        <TouchableOpacity onPress={() => toggleSection('ops')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.riskSectionTitle}>🎯 OPERATIONAL CONSIDERATIONS</Text>
                          <Text style={{ color: '#4a5568', fontSize: 12 }}>{expandedSections.has('ops') ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {expandedSections.has('ops') && riskData.operationalConsiderations.map((o: string, i: number) => (
                          <Text key={i} style={styles.riskBulletGreen}>◆ {o}</Text>
                        ))}
                      </View>
                    )}
                    {/* AI-Assisted Interpretation */}
                    {riskData.aiAssistedInterpretation?.length > 0 && (
                      <View style={styles.riskSection} onLayout={(e) => registerSection('ai_interp', e.nativeEvent.layout.y)}>
                        <TouchableOpacity onPress={() => toggleSection('ai_interp')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: '#9b6dff', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 }}>🤖 AI-ASSISTED INTERPRETATION ({riskData.aiAssistedInterpretation.length})</Text>
                          <Text style={{ color: '#4a5568', fontSize: 12 }}>{expandedSections.has('ai_interp') ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        <Text style={{ color: '#6b5b8a', fontSize: 10, marginBottom: 6, fontStyle: 'italic' }}>
                          Analytical interpretation generated from available findings. Not source-confirmed. Requires professional review.
                        </Text>
                        {expandedSections.has('ai_interp') && riskData.aiAssistedInterpretation.map((item: any, i: number) => (
                          <View key={i} style={{ backgroundColor: '#1a0a2e', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#9b6dff' }}>
                            <Text style={{ color: '#c4b5f7', fontSize: 12, lineHeight: 18, marginBottom: 6 }}>{item.statement}</Text>
                            {item.uncertainty && (
                              <Text style={{ color: '#6b5b8a', fontSize: 10, lineHeight: 15, marginBottom: 4 }}>△ Uncertainty: {item.uncertainty}</Text>
                            )}
                            {item.alternativeInterpretation && (
                              <Text style={{ color: '#6b5b8a', fontSize: 10, lineHeight: 15, marginBottom: 4 }}>◇ Alternative: {item.alternativeInterpretation}</Text>
                            )}
                            <Text style={{ color: '#9b6dff', fontSize: 9, fontWeight: '600', marginTop: 4 }}>REQUIRES PROFESSIONAL REVIEW</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Confidence & Limitations */}
                    {riskData.confidenceAndLimitations && (
                      <View style={styles.riskSection}>
                        <TouchableOpacity onPress={() => toggleSection('conf')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.riskSectionTitle}>📊 CONFIDENCE & LIMITATIONS</Text>
                          <Text style={{ color: '#4a5568', fontSize: 12 }}>{expandedSections.has('conf') ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {expandedSections.has('conf') && (
                          <>
                            <Text style={styles.riskBulletGreen}>◆ Overall: {riskData.confidenceAndLimitations.overallConfidence} — {riskData.confidenceAndLimitations.basis}</Text>
                            {riskData.confidenceAndLimitations.limitations?.map((l: string, i: number) => (
                              <Text key={i} style={styles.riskBulletAmber}>△ {l}</Text>
                            ))}
                            <Text style={[styles.riskSummary, { marginTop: 8, fontStyle: 'italic' }]}>{riskData.confidenceAndLimitations.disclaimer}</Text>
                          </>
                        )}
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <TouchableOpacity style={[styles.aiBtn, { flex: 1 }]} onPress={handleAISummary} disabled={loadingAI}>
                        <Text style={styles.aiBtnText}>↺ Regenerate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.aiBtn, { flex: 1, backgroundColor: '#1a3a2a' }]} onPress={handleSaveBriefToCase} disabled={!riskData}>
                        <Text style={[styles.aiBtnText, { color: '#34c759' }]}>📁 Save to Case</Text>
                      </TouchableOpacity>
                    </View>
                    {briefHistory.length > 1 && (
                      <TouchableOpacity
                        style={{ marginTop: 8, padding: 8, alignItems: 'center' }}
                        onPress={() => setShowBriefHistory(!showBriefHistory)}
                      >
                        <Text style={{ color: '#4a5568', fontSize: 10, fontWeight: '600' }}>
                          {showBriefHistory ? '▲ Hide' : '▼ Show'} version history ({briefHistory.length} versions)
                        </Text>
                      </TouchableOpacity>
                    )}
                    {showBriefHistory && briefHistory.length > 1 && (
                      <View style={{ backgroundColor: '#0a0f1a', borderRadius: 8, padding: 12, marginTop: 4 }}>
                        <Text style={{ color: '#4a9eff', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 }}>BRIEF VERSION HISTORY</Text>
                        {briefHistory.map((v, i) => (
                          <TouchableOpacity
                            key={i}
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < briefHistory.length - 1 ? 1 : 0, borderBottomColor: '#1a2035' }}
                            onPress={() => { setRiskData(v.data); setShowBriefHistory(false); }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: i === briefHistory.length - 1 ? '#4a9eff' : '#e8eaf0', fontSize: 12, fontWeight: '600' }}>
                                Version {v.version} {i === briefHistory.length - 1 ? '(current)' : ''}
                              </Text>
                              <Text style={{ color: '#4a5568', fontSize: 10, marginBottom: 4 }}>{v.timestamp}</Text>
                              {(v as any).changes?.map((ch: string, ci: number) => (
                                <Text key={ci} style={{ color: '#6b7a99', fontSize: 9, lineHeight: 13 }}>→ {ch}</Text>
                              ))}
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ color: '#6b7a99', fontSize: 10 }}>{v.data.preContactOverview?.identityConfidence || 'N/A'}</Text>
                              <Text style={{ color: '#6b7a99', fontSize: 9 }}>{v.data.preContactOverview?.operationalRiskStatus?.replace(/_/g, ' ') || ''}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Recommended Intelligence Path */}
                    {riskData.recommendedIntelligencePath?.length > 0 && (
                      <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#1a2035', paddingTop: 12 }}>
                        <TouchableOpacity onPress={() => toggleSection('path')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={{ color: '#4a9eff', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>RECOMMENDED INTELLIGENCE PATH</Text>
                          <Text style={{ color: '#4a5568', fontSize: 12 }}>{expandedSections.has('path') ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        <Text style={{ color: '#4a5568', fontSize: 10, marginBottom: 8 }}>Sources and modules selected for this intelligence assessment</Text>
                        {expandedSections.has('path') && riskData.recommendedIntelligencePath.map((p: any, i: number) => (
                          <View key={i} style={{ backgroundColor: '#0a0f1a', borderRadius: 8, padding: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: p.priority === 'HIGH' ? '#ff453a' : p.priority === 'MEDIUM' ? '#ff9f0a' : '#4a9eff' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ color: '#e8eaf0', fontSize: 12, fontWeight: '700' }}>{p.module}</Text>
                              <Text style={{ color: p.status === 'RAN_AUTOMATICALLY' ? '#34c759' : p.status === 'RECOMMENDED_MANUAL' ? '#ff9f0a' : '#4a5568', fontSize: 9, fontWeight: '600' }}>
                                {p.status?.replace(/_/g, ' ')}
                              </Text>
                            </View>
                            <Text style={{ color: '#6b7a99', fontSize: 11, lineHeight: 16 }}>{p.reason}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : aiSummary ? (
                  <Text style={styles.aiSummaryText}>{aiSummary}</Text>
                ) : (
                  <>
                    <Text style={styles.aiCardHint}>
                      Generate a structured Pre-Contact Intelligence Brief — identity confidence, risk indicators, contradictions, information gaps, and recommended checks before contact.
                    </Text>
                    <TouchableOpacity
                      style={styles.aiBtn}
                      onPress={handleAISummary}
                      disabled={loadingAI}
                    >
                      {loadingAI ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.aiBtnText}>Generate Pre-Contact Brief</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {result && (
              <TouchableOpacity
                style={styles.pdfBtn}
                onPress={handleExportPDF}
                disabled={exporting}
              >
                <Text style={styles.pdfBtnText}>{exporting ? '…' : '↓  Export PDF'}</Text>
                {!isPro && <Text style={styles.proBadgeText}>PRO</Text>}
              </TouchableOpacity>
            )}


            {/* Pro preview — Solo users only */}
            {!isPro && (
              <View style={styles.proPreviewCard}>
                <View style={styles.proPreviewHeader}>
                  <Text style={styles.proPreviewTitle}>⭐ Pro Features</Text>
                  <View style={styles.proPreviewBadge}>
                    <Text style={styles.proPreviewBadgeText}>PRO ONLY</Text>
                  </View>
                </View>
                <Text style={styles.proPreviewSubtitle}>
                  Pro provides deeper analysis and broader coverage than Solo.
                </Text>
                <View style={styles.proPreviewList}>
                  {[
                    { icon: '🔒', text: 'Pre-Contact Intelligence Brief — identity confidence, risk indicators, operational status' },
                    { icon: '🔒', text: 'Deep Background Analysis — comprehensive subject profile' },
                    { icon: '🔒', text: 'Contradiction Detection — cross-source inconsistencies' },
                    { icon: '🔒', text: 'FBI, Interpol & all 50 US state wanted checks' },
                    { icon: '🔒', text: 'Canadian federal, provincial & city wanted databases' },
                    { icon: '🔒', text: 'OFAC, UN, EU & BIS sanctions screening' },
                    { icon: '🔒', text: 'Investigation Strategy — recommended next steps' },
                    { icon: '🔒', text: 'AI Case Report Generation' },
                  ].map((item, i) => (
                    <View key={i} style={styles.proPreviewRow}>
                      <Text style={styles.proPreviewIcon}>{item.icon}</Text>
                      <Text style={styles.proPreviewItem}>{item.text}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.proPreviewBtn}
                  onPress={onUpgrade}
                >
                  <Text style={styles.proPreviewBtnText}>Upgrade to Pro →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Module results */}
            <Text style={styles.sectionTitle}>
              SUPPORTING INTELLIGENCE SOURCES
            </Text>
            <Text style={{ color: '#4a5568', fontSize: 11, marginBottom: 8, marginTop: -4, paddingHorizontal: 4 }}>
              Intelligence workflow supported by {result.modules.reduce((acc, m) => acc + m.links.length, 0)} public sources across {result.modules.length} intelligence modules
            </Text>

            {result.modules.map((module, idx) => {
              const isExpanded = expandedModules.has(idx);
              const isAutoModule = module.module.includes('INTELLIGENCE') || module.module.includes('WANTED') || module.module.includes('BREACH') || module.module.includes('MULTI');
              const isAlert = module.module.includes('WANTED');
              const isBreachAlert = module.module.includes('BREACH') && module.links.some(l => l.label.includes('🚨'));
              const hasAlert = module.links.some(l => l.label.includes('🚨') || l.label.includes('[HIGH]'));
              const sourceState = isAutoModule
                ? (hasAlert ? 'RESULT_REVIEWED' : 'QUERY_EXECUTED')
                : 'SOURCE_AVAILABLE';
              const sourceStateColor = sourceState === 'RESULT_REVIEWED' ? '#34c759' :
                                       sourceState === 'QUERY_EXECUTED' ? '#4a9eff' : '#4a5568';
              const sourceStateLabel = sourceState === 'RESULT_REVIEWED' ? 'REVIEWED' :
                                       sourceState === 'QUERY_EXECUTED' ? 'QUERY EXECUTED' : 'AVAILABLE';
              return (
                <View key={idx} style={[styles.moduleCard, isAutoModule && styles.moduleCardAuto, isAlert && styles.moduleCardAlert, isBreachAlert && styles.moduleCardAlert]}>
                  <TouchableOpacity
                    style={styles.moduleTitleRow}
                    onPress={() => {
                      const next = new Set(expandedModules);
                      if (next.has(idx)) next.delete(idx);
                      else next.add(idx);
                      setExpandedModules(next);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.moduleTitle, isAutoModule && styles.moduleTitleAuto]}>
                        {module.icon}  {module.module}
                      </Text>
                      <Text style={{ color: sourceStateColor, fontSize: 8, fontWeight: '700', letterSpacing: 1, marginTop: 2 }}>{sourceStateLabel}</Text>
                    </View>
                    <Text style={styles.moduleChevron}>{isExpanded ? '▼' : '▶'}</Text>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.linkGrid}>
                      {isSearching && isAutoModule && (
                        <View style={styles.moduleLoadingRow}>
                          <ActivityIndicator color={C.accent} size='small' />
                          <Text style={styles.moduleLoadingTxt}>Fetching live data…</Text>
                        </View>
                      )}
                      {module.links.map((link, lidx) => (
                        <TouchableOpacity
                          key={lidx}
                          style={[styles.linkBtn, evidenceTags[link.url] ? styles.linkBtnTagged : null]}
                          onPress={() => openLink(link.url)}
                          onLongPress={() => handleEvidenceTag(link.url, link.label)}
                        >
                          <Text style={styles.linkBtnText}>{link.label}</Text>
                          {evidenceTags[link.url] && (
                            <Text style={styles.evidenceTag}>{
                              evidenceTags[link.url] === 'Evidence' ? '🔴' :
                              evidenceTags[link.url] === 'Lead' ? '🟡' : '🟢'
                            } {evidenceTags[link.url]}</Text>
                          )}
                          <Text style={styles.linkArrow}>↗</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.bottomPad} />
          </>
        )}

        {/* Empty state */}
        {!searched && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>One query, all sources</Text>
            <Text style={styles.emptyText}>
              Sentinel automatically detects what you've entered and
              surfaces the most relevant OSINT sources — no module selection needed.
            </Text>
            <View style={styles.exampleList}>
              {[
                ['👤', 'John Michael Smith'],
                ['📞', '+1 (555) 123-4567'],
                ['✉️', 'target@company.com'],
                ['🌐', '192.168.1.1'],
                ['🔗', 'example.com'],
              ].map(([icon, ex], i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.exampleChip}
                  onPress={() => { setQuery(ex); }}
                >
                  <Text style={styles.exampleText}>{icon}  {ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  scroll:         { flex: 1 },

  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: SPACE.md, paddingTop: SPACE.lg, paddingBottom: SPACE.sm,
                    borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:        { padding: 12, marginLeft: -4 },
  backText:       { color: C.accent, fontSize: 22, fontWeight: '600' },
  headerTitle:    { color: C.text, fontSize: FONT.md, fontWeight: '600' },
  tierBadge:      { backgroundColor: C.accent + '30', borderRadius: 4,
                    paddingHorizontal: 8, paddingVertical: 2 },
  tierText:       { color: C.accent, fontSize: 11, fontWeight: '700' },

  searchCard:     { margin: SPACE.md, backgroundColor: C.card, borderRadius: 12,
                    padding: SPACE.md, borderWidth: 1, borderColor: C.border },
  searchLabel:    { color: C.text, fontSize: FONT.md, fontWeight: '600', marginBottom: 4 },
  searchHint:     { color: C.textDim, fontSize: FONT.xs, marginBottom: SPACE.sm },
  inputRow:       { flexDirection: 'row', gap: SPACE.sm },
  input:          { flex: 1, backgroundColor: C.bg, borderRadius: 8, borderWidth: 1,
                    borderColor: C.border, color: C.text, paddingHorizontal: SPACE.sm,
                    paddingVertical: 10, fontSize: FONT.sm },
  searchBtn:      { backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  searchBtnText:  { color: '#fff', fontSize: FONT.sm, fontWeight: '600' },

  typeBadge:      { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                    marginHorizontal: SPACE.md, marginBottom: SPACE.sm,
                    borderRadius: 10, borderWidth: 1, padding: SPACE.sm },
  typeBadgeIcon:  { fontSize: 24 },
  typeBadgeLabel: { fontSize: FONT.sm, fontWeight: '700' },
  typeBadgeQuery: { color: C.textDim, fontSize: FONT.xs, marginTop: 2 },

  aiCard:         { margin: SPACE.md, marginTop: 0, backgroundColor: '#1a0a2e', borderRadius: 12,
                    padding: SPACE.md, borderWidth: 1, borderColor: '#6C3483' },
  aiCardHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: SPACE.sm },
  aiCardTitle:    { color: '#D7BDE2', fontSize: FONT.sm, fontWeight: '700' },
  proBadge:       { backgroundColor: '#6C3483', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  proBadgeText:   { color: '#fff', fontSize: 10, fontWeight: '700' },
  aiCardHint:     { color: '#A569BD', fontSize: FONT.xs, marginBottom: SPACE.sm },
  moduleLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  moduleLoadingTxt: { color: C.textDim, fontSize: 11 },
  multiInputHint: { color: C.textDim, fontSize: 11, textAlign: 'center', marginBottom: 8, lineHeight: 16 },
  loadingPhaseBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: C.card, borderRadius: 8, marginBottom: 8 },
  loadingPhaseTxt: { color: C.textMid, fontSize: 13 },
  confidenceBox:  { alignItems: 'center', backgroundColor: C.accentDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  confidenceNum:  { color: C.accent, fontSize: 16, fontWeight: '800' },
  confidenceLbl:  { color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  riskScoreBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 10, marginBottom: 12, flexWrap: 'wrap' },
  riskScoreNum:   { fontSize: 48, fontWeight: '900', lineHeight: 52 },
  riskLevel:      { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, flexShrink: 1 },
  riskSummary:    { color: C.textMid, fontSize: 12, lineHeight: 16, marginTop: 4, flexShrink: 1, flexWrap: 'wrap' },
  riskSection:    { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1a2035' },
  riskSectionTitle: { color: '#6b7a99', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  riskBulletGreen: { color: '#34c759', fontSize: 12, lineHeight: 19, marginBottom: 4 },
  riskBulletRed:  { color: '#ff453a', fontSize: 12, lineHeight: 19, marginBottom: 4 },
  riskBulletAmber: { color: '#ff9f0a', fontSize: 12, lineHeight: 19, marginBottom: 4 },
  riskBulletBlue: { color: '#4a9eff', fontSize: 12, lineHeight: 19, marginBottom: 4 },
  pdfBtn:         { backgroundColor: '#1a0a2e', borderRadius: 8, padding: SPACE.sm, alignItems: 'center', marginBottom: SPACE.sm, borderWidth: 1, borderColor: '#9B59B6', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  pdfBtnText:     { color: '#9B59B6', fontSize: FONT.sm, fontWeight: '600' },
  aiBtn:          { backgroundColor: '#6C3483', borderRadius: 8, padding: SPACE.sm,
                    alignItems: 'center' },
  aiBtnText:      { color: '#fff', fontSize: FONT.sm, fontWeight: '600' },
  aiSummaryText:  { color: '#D7BDE2', fontSize: FONT.sm, lineHeight: 20 },

  upgradeCard:    { marginHorizontal: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.card,
                    borderRadius: 10, padding: SPACE.sm, borderWidth: 1, borderColor: C.border },
  upgradeText:    { color: C.textDim, fontSize: FONT.xs, textAlign: 'center' },

  proPreviewCard:    { marginHorizontal: SPACE.md, marginBottom: SPACE.md, backgroundColor: '#0d1f0d',
                       borderRadius: 12, padding: SPACE.md, borderWidth: 1.5, borderColor: '#2d5a2d' },
  proPreviewHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       marginBottom: 6 },
  proPreviewTitle:   { color: '#4CAF50', fontSize: FONT.sm, fontWeight: '700' },
  proPreviewBadge:   { backgroundColor: '#1a3a1a', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  proPreviewBadgeText: { color: '#4CAF50', fontSize: 9, fontWeight: '700' },
  proPreviewSubtitle: { color: '#81C784', fontSize: FONT.xs, marginBottom: SPACE.sm, lineHeight: 16 },
  proPreviewList:    { gap: 6, marginBottom: SPACE.md },
  proPreviewRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  proPreviewIcon:    { fontSize: 13, marginTop: 1 },
  proPreviewItem:    { color: '#A5D6A7', fontSize: FONT.xs, flex: 1, lineHeight: 17 },
  proPreviewBtn:     { backgroundColor: '#2d5a2d', borderRadius: 8, padding: 12,
                       alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50' },
  proPreviewBtnText: { color: '#4CAF50', fontSize: FONT.sm, fontWeight: '700' },

  sectionTitle:   { color: C.textDim, fontSize: FONT.xs, marginHorizontal: SPACE.md,
                    marginBottom: SPACE.sm, textTransform: 'uppercase', letterSpacing: 1 },

  moduleCardAuto: { borderColor: C.accent, borderWidth: 1 },
  moduleCardAlert: { borderColor: C.red, borderWidth: 2, backgroundColor: C.redDim },
  moduleTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moduleTitleAuto: { color: C.accent },
  moduleChevron:  { color: C.textDim, fontSize: 12 },
  moduleCard:     { marginHorizontal: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.card,
                    borderRadius: 12, padding: SPACE.md, borderWidth: 1, borderColor: C.border },
  moduleTitle:    { color: C.text, fontSize: FONT.sm, fontWeight: '700', marginBottom: SPACE.sm },
  linkGrid:       { gap: SPACE.xs },
  linkBtn:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: SPACE.sm,
                    paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  linkBtnText:    { color: C.accent, fontSize: FONT.sm },
  linkBtnTagged:  { borderColor: C.green, borderWidth: 1 },
  evidenceTag:    { fontSize: 11, color: C.textMid, fontWeight: '700' },
  linkArrow:      { color: C.textDim, fontSize: FONT.sm },

  emptyState:     { alignItems: 'center', padding: SPACE.xl, paddingTop: SPACE.xxl },
  emptyIcon:      { fontSize: 48, marginBottom: SPACE.md },
  emptyTitle:     { color: C.text, fontSize: FONT.lg, fontWeight: '700', marginBottom: SPACE.sm },
  emptyText:      { color: C.textDim, fontSize: FONT.sm, textAlign: 'center',
                    lineHeight: 20, marginBottom: SPACE.lg },
  exampleList:    { gap: SPACE.xs, width: '100%' },
  exampleChip:    { backgroundColor: C.card, borderRadius: 8, padding: SPACE.sm,
                    borderWidth: 1, borderColor: C.border },
  exampleText:    { color: C.textDim, fontSize: FONT.sm },

  bottomPad:      { height: SPACE.xxl },
  templateToggle: { marginTop: 8, marginBottom: 4, paddingVertical: 6 },
  templateToggleText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  templateList:   { gap: 8, marginBottom: 8 },
  templateChip:   { backgroundColor: C.bg, borderRadius: 10, padding: 12,
                    borderWidth: 1, borderColor: C.accent },
  templateChipName: { color: C.accent, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  templateChipDesc: { color: C.textDim, fontSize: 12 },
});
