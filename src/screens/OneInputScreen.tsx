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
import { analyzeResults, generatePreContactBrief } from '../utils/aiEngine';
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
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [confidence, setConfidence]     = useState<number>(0);
  const [displayScore, setDisplayScore]   = useState<number>(0);
  const [displayConf, setDisplayConf]     = useState<number>(0);
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0, 1, 2]));
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

  const handleExportPDF = async () => {
    if (!result) return;
    setExporting(true);
    try {
      const osintResults = result.modules.flatMap(m =>
        m.links.map(l => ({ label: l.label, value: l.url, type: 'link' as const }))
      );

      if (riskData) {
        // Full investigation report with Risk Score
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
            description: `AI Risk Score: ${riskData.riskScore}/100 · Risk Level: ${riskData.riskLevel}`,
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
      const clean = briefJson.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setRiskData(parsed);
      setAiSummary(parsed.confidenceAndLimitations?.disclaimer || '');
    } catch (e: any) {
      Alert.alert('AI Error', 'Could not generate Pre-Contact Brief.');
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
                <Text style={[styles.typeBadgeLabel, { color: typeColor }]}>
                  Detected: {result.detectedAs}
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
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                </View>
                {riskData ? (
                  <View>
                    {/* Risk Score */}
                    <View style={[styles.riskScoreBox, {
                      backgroundColor: riskData.riskLevel === 'CRITICAL' ? '#3d0000' :
                                       riskData.riskLevel === 'HIGH' ? '#2d1500' :
                                       riskData.riskLevel === 'MEDIUM' ? '#2d2200' : '#001a00'
                    }]}>
                      <Text style={[styles.riskScoreNum, { fontSize: 52, fontWeight: '900' }, {
                        color: riskData.riskLevel === 'CRITICAL' ? '#ff3b30' :
                               riskData.riskLevel === 'HIGH' ? '#ff9500' :
                               riskData.riskLevel === 'MEDIUM' ? '#ffcc00' : '#30d158'
                      }]}>{displayScore}</Text>
                      <View>
                        <Text style={[styles.riskLevel, {
                          color: riskData.riskLevel === 'CRITICAL' ? '#ff3b30' :
                                 riskData.riskLevel === 'HIGH' ? '#ff9500' :
                                 riskData.riskLevel === 'MEDIUM' ? '#ffcc00' : '#30d158'
                        }]}>{riskData.riskLevel} RISK</Text>
                        <Text style={styles.riskSummary}>{riskData.summary}</Text>
                      </View>
                    </View>
                    {/* Identity Confidence */}
                    {riskData.identityConfidence && (
                      <View style={styles.riskSection}>
                        <Text style={styles.riskSectionTitle}>🪪 IDENTITY CONFIDENCE</Text>
                        <Text style={[styles.riskBulletGreen, {
                          color: riskData.identityConfidence.level === 'HIGH' ? '#30d158' :
                                 riskData.identityConfidence.level === 'MEDIUM' ? '#ffcc00' :
                                 riskData.identityConfidence.level === 'LOW' ? '#ff9500' : '#ff3b30'
                        }]}>◆ {riskData.identityConfidence.level} — {riskData.identityConfidence.basis}</Text>
                        {riskData.identityConfidence.uncertainties?.map((u: string, i: number) => (
                          <Text key={i} style={styles.riskBulletAmber}>△ {u}</Text>
                        ))}
                      </View>
                    )}
                    {/* Known Information */}
                    {riskData.knownInformation?.length > 0 && (
                      <View style={styles.riskSection}>
                        <Text style={styles.riskSectionTitle}>✅ KNOWN INFORMATION</Text>
                        {riskData.knownInformation.map((k: any, i: number) => (
                          <Text key={i} style={styles.riskBulletGreen}>◆ [{k.confidence}] {k.finding} — {k.source}</Text>
                        ))}
                      </View>
                    )}
                    {/* Potential Risk Indicators */}
                    {riskData.potentialRiskIndicators?.length > 0 && (
                      <View style={styles.riskSection}>
                        <Text style={styles.riskSectionTitle}>🚨 POTENTIAL RISK INDICATORS</Text>
                        {riskData.potentialRiskIndicators.map((r: any, i: number) => (
                          <Text key={i} style={r.severity === 'HIGH' ? styles.riskBulletRed : r.severity === 'MEDIUM' ? styles.riskBulletAmber : styles.riskBulletBlue}>
                            ● [{r.severity}] {r.indicator} — {r.status}
                          </Text>
                        ))}
                      </View>
                    )}
                    {/* Contradictions */}
                    {riskData.contradictionsAndInconsistencies?.length > 0 && (
                      <View style={styles.riskSection}>
                        <Text style={styles.riskSectionTitle}>⚠️ CONTRADICTIONS & INCONSISTENCIES</Text>
                        {riskData.contradictionsAndInconsistencies.map((c: any, i: number) => (
                          <Text key={i} style={styles.riskBulletAmber}>▲ [{c.significance}] {c.description}</Text>
                        ))}
                      </View>
                    )}
                    {/* Information Gaps */}
                    {riskData.informationGaps?.length > 0 && (
                      <View style={styles.riskSection}>
                        <Text style={styles.riskSectionTitle}>🔍 INFORMATION GAPS</Text>
                        {riskData.informationGaps.map((g: any, i: number) => (
                          <Text key={i} style={styles.riskBulletBlue}>→ [{g.importance}] {g.gap} — {g.suggestedCheck}</Text>
                        ))}
                      </View>
                    )}
                    {/* Recommended Checks */}
                    {riskData.recommendedChecksBeforeContact?.length > 0 && (
                      <View style={styles.riskSection}>
                        <Text style={styles.riskSectionTitle}>📋 RECOMMENDED CHECKS BEFORE CONTACT</Text>
                        {riskData.recommendedChecksBeforeContact.map((c: any, i: number) => (
                          <Text key={i} style={styles.riskBulletBlue}>→ [{c.priority}] {c.module} — {c.reason}</Text>
                        ))}
                      </View>
                    )}
                    {/* Operational Considerations */}
                    {riskData.operationalConsiderations?.length > 0 && (
                      <View style={styles.riskSection}>
                        <Text style={styles.riskSectionTitle}>🎯 OPERATIONAL CONSIDERATIONS</Text>
                        {riskData.operationalConsiderations.map((o: string, i: number) => (
                          <Text key={i} style={styles.riskBulletGreen}>◆ {o}</Text>
                        ))}
                      </View>
                    )}
                    {/* Confidence & Limitations */}
                    {riskData.confidenceAndLimitations && (
                      <View style={styles.riskSection}>
                        <Text style={styles.riskSectionTitle}>📊 CONFIDENCE & LIMITATIONS</Text>
                        <Text style={styles.riskBulletGreen}>◆ Overall: {riskData.confidenceAndLimitations.overallConfidence} — {riskData.confidenceAndLimitations.basis}</Text>
                        {riskData.confidenceAndLimitations.limitations?.map((l: string, i: number) => (
                          <Text key={i} style={styles.riskBulletAmber}>△ {l}</Text>
                        ))}
                        <Text style={[styles.riskSummary, { marginTop: 8, fontStyle: 'italic' }]}>{riskData.confidenceAndLimitations.disclaimer}</Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.aiBtn} onPress={handleAISummary} disabled={loadingAI}>
                      <Text style={styles.aiBtnText}>↺ Regenerate Brief</Text>
                    </TouchableOpacity>
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
                    { icon: '🔒', text: 'AI Risk Score (0–100) — LOW / MEDIUM / HIGH / CRITICAL' },
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
              {result.modules.reduce((acc, m) => acc + m.links.length, 0)} sources across {result.modules.length} modules
            </Text>

            {result.modules.map((module, idx) => {
              const isExpanded = expandedModules.has(idx);
              const isAutoModule = module.module.includes('INTELLIGENCE') || module.module.includes('WANTED') || module.module.includes('BREACH') || module.module.includes('MULTI');
              const isAlert = module.module.includes('WANTED');
              const isBreachAlert = module.module.includes('BREACH') && module.links.some(l => l.label.includes('🚨'));
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
                    <Text style={[styles.moduleTitle, isAutoModule && styles.moduleTitleAuto]}>
                      {module.icon}  {module.module}
                    </Text>
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
  riskSection:    { marginTop: 10 },
  riskSectionTitle: { color: C.textMid, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  riskBulletGreen: { color: '#30d158', fontSize: 12, lineHeight: 18, marginBottom: 2 },
  riskBulletRed:  { color: '#ff3b30', fontSize: 12, lineHeight: 18, marginBottom: 2 },
  riskBulletAmber: { color: '#ffcc00', fontSize: 12, lineHeight: 18, marginBottom: 2 },
  riskBulletBlue: { color: C.accent, fontSize: 12, lineHeight: 18, marginBottom: 2 },
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
