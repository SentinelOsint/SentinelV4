#!/usr/bin/env python3
"""
Sentinel — Korjaa Screen-tyyppi ja päivittää CaseIntakeScreen
"""

import os
import shutil

# ── 1. Korjaa Screen-tyyppi types/index.ts:ssä ───────────────────────────
TYPES_FILE = os.path.expanduser('~/Downloads/SentinelV4/src/types/index.ts')

def fix_screen_type():
    if not os.path.exists(TYPES_FILE):
        # Etsitään muualta
        for path in [
            os.path.expanduser('~/Downloads/SentinelV4/src/types.ts'),
            os.path.expanduser('~/Downloads/SentinelV4/types.ts'),
        ]:
            if os.path.exists(path):
                return fix_in_file(path)
        print("⚠️  types-tiedostoa ei löydy — etsitään App.tsx:stä")
        return fix_in_app()
    return fix_in_file(TYPES_FILE)

def fix_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Etsitään Screen type
    if 'case_intake' in content:
        print("✅ case_intake jo lisätty types-tiedostoon")
        return True
    
    # Yritetään löytää Screen type ja lisätä case_intake
    replacements = [
        ("'breach'", "'breach' | 'case_intake'"),
        ('"breach"', '"breach" | "case_intake"'),
    ]
    
    changed = False
    for old, new in replacements:
        if old in content and 'case_intake' not in content:
            content = content.replace(old, new, 1)
            changed = True
            break
    
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Screen type päivitetty: {filepath}")
        return True
    else:
        print(f"⚠️  Screen type ei löydy tiedostosta: {filepath}")
        return False

def fix_in_app():
    APP_FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')
    with open(APP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Etsitään Screen type App.tsx:stä
    old_screen = "'breach'"
    new_screen = "'breach' | 'case_intake'"
    
    if 'case_intake' in content:
        print("✅ case_intake jo App.tsx:ssä")
        return True
    
    if old_screen in content:
        content = content.replace(old_screen, new_screen, 1)
        with open(APP_FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print("✅ Screen type päivitetty App.tsx:ssä")
        return True
    
    print("❌ Screen type ei löydy")
    return False

# ── 2. Kirjoita oikea CaseIntakeScreen ───────────────────────────────────
SCREEN_FILE = os.path.expanduser('~/Downloads/SentinelV4/src/screens/CaseIntakeScreen.tsx')

CORRECT_SCREEN = '''/**
 * SENTINEL – Case Intake & AI Pre-Assessment (Pro)
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { C, IS_IPAD, SPACE, FONT } from '../utils/theme';
import { AuditLog } from '../utils/auditLog';

interface Props {
  isPro: boolean;
  onBack: () => void;
  onUpgrade: () => void;
}

interface AssessmentResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  keyFindings: string[];
  redFlags: string[];
  recommendedActions: string[];
  pricingRecommendation: string;
  estimatedComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'HIGH_COMPLEXITY';
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

const RISK_COLORS = {
  LOW:      '#30d158',
  MEDIUM:   '#ffcc00',
  HIGH:     '#ff9500',
  CRITICAL: '#ff3b30',
};

const COMPLEXITY_LABELS = {
  SIMPLE:          'Simple — standard rates apply',
  MODERATE:        'Moderate — consider 1.25x rate',
  COMPLEX:         'Complex — consider 1.5x rate',
  HIGH_COMPLEXITY: 'High Complexity — consider 2x rate or fixed fee',
};

export default function CaseIntakeScreen({ isPro, onBack, onUpgrade }: Props) {
  const [subjectName,  setSubjectName]  = useState('');
  const [subjectAge,   setSubjectAge]   = useState('');
  const [location,     setLocation]     = useState('');
  const [caseType,     setCaseType]     = useState('');
  const [background,   setBackground]   = useState('');
  const [concerns,     setConcerns]     = useState('');
  const [isListening,  setIsListening]  = useState(false);
  const [activeField,  setActiveField]  = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [assessment,   setAssessment]   = useState<AssessmentResult | null>(null);

  const CASE_TYPES = [
    'Skip Trace', 'Surveillance', 'Process Serve',
    'Due Diligence', 'Background Check', 'Fugitive Recovery',
    'Asset Search', 'Other',
  ];

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript || '';
    if (text && activeField) {
      switch (activeField) {
        case 'background': setBackground(prev => prev ? prev + ' ' + text : text); break;
        case 'concerns':   setConcerns(prev => prev ? prev + ' ' + text : text); break;
        case 'location':   setLocation(text); break;
      }
    }
  });

  useSpeechRecognitionEvent('end', () => { setIsListening(false); setActiveField(null); });
  useSpeechRecognitionEvent('error', () => { setIsListening(false); setActiveField(null); });

  const startDictation = async (field: string) => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Microphone access is needed for dictation.');
        return;
      }
      setActiveField(field);
      setIsListening(true);
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: false, continuous: false });
    } catch {
      setIsListening(false);
      setActiveField(null);
      Alert.alert('Error', 'Could not start speech recognition.');
    }
  };

  const stopDictation = () => {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
    setActiveField(null);
  };

  const runAssessment = async () => {
    if (!subjectName.trim() && !background.trim()) {
      Alert.alert('Required', 'Please enter at least a subject name or background information.');
      return;
    }
    setLoading(true);
    setAssessment(null);
    try {
      const intakeData = [
        subjectName && `Subject Name: ${subjectName}`,
        subjectAge  && `Age/DOB: ${subjectAge}`,
        location    && `Location: ${location}`,
        caseType    && `Case Type: ${caseType}`,
        background  && `Background Information: ${background}`,
        concerns    && `Special Concerns: ${concerns}`,
      ].filter(Boolean).join('\\n');

      const systemPrompt = `You are a senior investigative analyst. Analyze client intake information and provide a professional pre-assessment. Respond ONLY with valid JSON, no markdown.`;

      const userPrompt = `Analyze this intake:\\n${intakeData}\\n\\nRespond with JSON:\\n{"riskScore":<0-100>,"riskLevel":"<LOW|MEDIUM|HIGH|CRITICAL>","summary":"<overview>","keyFindings":["<f1>","<f2>","<f3>"],"redFlags":[],"recommendedActions":["<a1>","<a2>","<a3>"],"pricingRecommendation":"<guidance>","estimatedComplexity":"<SIMPLE|MODERATE|COMPLEX|HIGH_COMPLEXITY>","confidenceLevel":"<LOW|MEDIUM|HIGH>"}`;

      const res = await fetch('https://sentinel-backend-production-05e1.up.railway.app/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, userPrompt }),
      });
      const data = await res.json();
      const clean = (data.result || '').replace(/```json|```/g, '').trim();
      setAssessment(JSON.parse(clean));
      await AuditLog.log('SEARCH_QUERY', `Case Intake: ${subjectName || 'Unknown'}`);
    } catch {
      Alert.alert('AI Error', 'Could not generate assessment. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setSubjectName(''); setSubjectAge(''); setLocation('');
    setCaseType(''); setBackground(''); setConcerns('');
    setAssessment(null);
  };

  if (!isPro) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>← Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Case Intake</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={s.proGate}>
          <Text style={s.proGateEmoji}>📋</Text>
          <Text style={s.proGateTitle}>Case Intake & AI Pre-Assessment</Text>
          <Text style={s.proGateText}>Enter or dictate client information during a meeting. AI instantly analyzes risk level, case complexity, and provides pricing recommendations.</Text>
          <TouchableOpacity style={s.proGateBtn} onPress={onUpgrade}>
            <Text style={s.proGateBtnText}>Upgrade to Pro →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const riskColor = assessment ? RISK_COLORS[assessment.riskLevel] : C.accent;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Case Intake</Text>
        <TouchableOpacity onPress={clearForm} style={s.clearBtn}><Text style={s.clearText}>Clear</Text></TouchableOpacity>
      </View>
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.introCard}>
          <Text style={s.introTitle}>📋 Client Intake — AI Pre-Assessment</Text>
          <Text style={s.introText}>Enter or dictate subject information. AI will assess risk level, case complexity, and provide pricing guidance.</Text>
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>SUBJECT INFORMATION</Text>
          <Text style={s.label}>Subject Name</Text>
          <TextInput style={s.input} value={subjectName} onChangeText={setSubjectName} placeholder="Full name or alias" placeholderTextColor={C.textDim} autoCapitalize="words" />
          <Text style={s.label}>Age / Date of Birth</Text>
          <TextInput style={s.input} value={subjectAge} onChangeText={setSubjectAge} placeholder="e.g. 45 or 1979-03-15" placeholderTextColor={C.textDim} />
          <Text style={s.label}>Last Known Location</Text>
          <View style={s.inputRow}>
            <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={location} onChangeText={setLocation} placeholder="City, State / Province" placeholderTextColor={C.textDim} />
            <TouchableOpacity style={[s.micBtn, activeField === 'location' && s.micBtnActive]} onPress={() => isListening && activeField === 'location' ? stopDictation() : startDictation('location')}>
              <Text style={s.micIcon}>{activeField === 'location' ? '⏹' : '🎤'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>CASE TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CASE_TYPES.map(type => (
              <TouchableOpacity key={type} style={[s.typeChip, caseType === type && s.typeChipActive]} onPress={() => setCaseType(caseType === type ? '' : type)}>
                <Text style={[s.typeChipText, caseType === type && s.typeChipTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>BACKGROUND INFORMATION</Text>
          <Text style={s.label}>Client-provided information</Text>
          <View style={s.textAreaRow}>
            <TextInput style={[s.input, s.textArea, { flex: 1, marginBottom: 0 }]} value={background} onChangeText={setBackground} multiline numberOfLines={4} textAlignVertical="top" placeholderTextColor={C.textDim} placeholder="What has the client told you? Prior addresses, employment, relationships, known associates..." />
            <TouchableOpacity style={[s.micBtn, s.micBtnTop, activeField === 'background' && s.micBtnActive]} onPress={() => isListening && activeField === 'background' ? stopDictation() : startDictation('background')}>
              <Text style={s.micIcon}>{activeField === 'background' ? '⏹' : '🎤'}</Text>
            </TouchableOpacity>
          </View>
          {activeField === 'background' && <Text style={s.listeningText}>🎤 Listening... tap ⏹ to stop</Text>}
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>SPECIAL CONCERNS</Text>
          <Text style={s.label}>Risk factors, evasion history, safety concerns</Text>
          <View style={s.textAreaRow}>
            <TextInput style={[s.input, s.textArea, { flex: 1, marginBottom: 0 }]} value={concerns} onChangeText={setConcerns} multiline numberOfLines={3} textAlignVertical="top" placeholderTextColor={C.textDim} placeholder="Criminal history, violence indicators, cross-border involvement, urgency..." />
            <TouchableOpacity style={[s.micBtn, s.micBtnTop, activeField === 'concerns' && s.micBtnActive]} onPress={() => isListening && activeField === 'concerns' ? stopDictation() : startDictation('concerns')}>
              <Text style={s.micIcon}>{activeField === 'concerns' ? '⏹' : '🎤'}</Text>
            </TouchableOpacity>
          </View>
          {activeField === 'concerns' && <Text style={s.listeningText}>🎤 Listening... tap ⏹ to stop</Text>}
        </View>
        <TouchableOpacity style={[s.assessBtn, loading && s.assessBtnDisabled]} onPress={runAssessment} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.assessBtnText}>🤖 Run AI Pre-Assessment</Text>}
        </TouchableOpacity>
        {assessment && (
          <View style={s.assessmentCard}>
            <View style={[s.riskHeader, { backgroundColor: riskColor + '20', borderColor: riskColor }]}>
              <Text style={[s.riskScore, { color: riskColor }]}>{assessment.riskScore}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.riskLevel, { color: riskColor }]}>{assessment.riskLevel} RISK</Text>
                <Text style={s.riskSummary}>{assessment.summary}</Text>
              </View>
            </View>
            <View style={s.complexityBox}>
              <Text style={s.complexityLabel}>CASE COMPLEXITY</Text>
              <Text style={s.complexityValue}>{COMPLEXITY_LABELS[assessment.estimatedComplexity]}</Text>
              <Text style={s.pricingLabel}>PRICING GUIDANCE</Text>
              <Text style={s.pricingValue}>{assessment.pricingRecommendation}</Text>
            </View>
            {assessment.keyFindings.length > 0 && (<View style={s.resultSection}><Text style={s.resultSectionTitle}>KEY FINDINGS</Text>{assessment.keyFindings.map((f, i) => <Text key={i} style={s.bulletGreen}>◆ {f}</Text>)}</View>)}
            {assessment.redFlags.length > 0 && (<View style={s.resultSection}><Text style={s.resultSectionTitle}>🚨 RED FLAGS</Text>{assessment.redFlags.map((r, i) => <Text key={i} style={s.bulletRed}>● {r}</Text>)}</View>)}
            {assessment.recommendedActions.length > 0 && (<View style={s.resultSection}><Text style={s.resultSectionTitle}>RECOMMENDED ACTIONS</Text>{assessment.recommendedActions.map((a, i) => <Text key={i} style={s.bulletBlue}>→ {a}</Text>)}</View>)}
            <Text style={s.confidenceText}>Assessment confidence: {assessment.confidenceLevel} — based on information provided</Text>
            <TouchableOpacity style={s.rerunBtn} onPress={runAssessment}><Text style={s.rerunBtnText}>↺ Regenerate Assessment</Text></TouchableOpacity>
          </View>
        )}
        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: C.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.md, paddingTop: SPACE.lg, paddingBottom: SPACE.sm, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:         { padding: 8, marginLeft: -4 },
  backText:        { color: C.accent, fontSize: 16, fontWeight: '600' },
  headerTitle:     { color: C.text, fontSize: FONT.md, fontWeight: '700' },
  clearBtn:        { padding: 8 },
  clearText:       { color: C.textDim, fontSize: FONT.sm },
  scroll:          { flex: 1 },
  introCard:       { margin: SPACE.md, backgroundColor: C.accentDim, borderRadius: 12, padding: SPACE.md, borderWidth: 1, borderColor: C.accent + '40' },
  introTitle:      { color: C.accent, fontSize: FONT.sm, fontWeight: '700', marginBottom: 4 },
  introText:       { color: C.textMid, fontSize: FONT.xs, lineHeight: 18 },
  section:         { marginHorizontal: SPACE.md, marginBottom: SPACE.md },
  sectionTitle:    { color: C.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACE.sm },
  label:           { color: C.textMid, fontSize: FONT.xs, marginBottom: 4 },
  input:           { backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, color: C.text, paddingHorizontal: SPACE.sm, paddingVertical: 10, fontSize: FONT.sm, marginBottom: SPACE.sm },
  textArea:        { minHeight: 80, paddingTop: 10 },
  inputRow:        { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: SPACE.sm },
  textAreaRow:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: SPACE.sm },
  micBtn:          { backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 10, alignItems: 'center', justifyContent: 'center', width: 44, height: 44 },
  micBtnActive:    { backgroundColor: '#3d0000', borderColor: '#ff3b30' },
  micBtnTop:       { marginTop: 0 },
  micIcon:         { fontSize: 18 },
  listeningText:   { color: '#ff3b30', fontSize: FONT.xs, marginBottom: SPACE.sm },
  typeChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, marginRight: 8, borderWidth: 1, borderColor: C.border },
  typeChipActive:  { backgroundColor: C.accentDim, borderColor: C.accent },
  typeChipText:    { color: C.textDim, fontSize: FONT.xs },
  typeChipTextActive: { color: C.accent, fontWeight: '700' },
  assessBtn:       { marginHorizontal: SPACE.md, backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: SPACE.md },
  assessBtnDisabled: { backgroundColor: C.textDim },
  assessBtnText:   { color: '#fff', fontSize: FONT.sm, fontWeight: '700' },
  assessmentCard:  { marginHorizontal: SPACE.md, backgroundColor: C.card, borderRadius: 14, padding: SPACE.md, borderWidth: 1, borderColor: C.border, marginBottom: SPACE.md },
  riskHeader:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1 },
  riskScore:       { fontSize: 48, fontWeight: '900', lineHeight: 52 },
  riskLevel:       { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  riskSummary:     { color: C.textMid, fontSize: 12, lineHeight: 16, marginTop: 4, flexShrink: 1 },
  complexityBox:   { backgroundColor: C.bg, borderRadius: 10, padding: 12, marginBottom: 12 },
  complexityLabel: { color: C.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  complexityValue: { color: C.text, fontSize: FONT.sm, fontWeight: '600', marginBottom: 8 },
  pricingLabel:    { color: C.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  pricingValue:    { color: C.accent, fontSize: FONT.sm, fontWeight: '600' },
  resultSection:   { marginTop: 10 },
  resultSectionTitle: { color: C.textMid, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  bulletGreen:     { color: '#30d158', fontSize: 12, lineHeight: 18, marginBottom: 2 },
  bulletRed:       { color: '#ff3b30', fontSize: 12, lineHeight: 18, marginBottom: 2 },
  bulletBlue:      { color: C.accent, fontSize: 12, lineHeight: 18, marginBottom: 2 },
  confidenceText:  { color: C.textDim, fontSize: 10, textAlign: 'center', marginTop: 12, marginBottom: 8 },
  rerunBtn:        { borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  rerunBtnText:    { color: C.textDim, fontSize: FONT.xs },
  proGate:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  proGateEmoji:    { fontSize: 48, marginBottom: 14 },
  proGateTitle:    { color: C.text, fontWeight: '800', fontSize: IS_IPAD ? 22 : 18, marginBottom: 12, textAlign: 'center' },
  proGateText:     { color: C.textMid, fontSize: IS_IPAD ? 15 : 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  proGateBtn:      { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  proGateBtnText:  { color: C.bg, fontWeight: '800', fontSize: 15 },
});
'''

def fix_screen_file():
    with open(SCREEN_FILE, 'w', encoding='utf-8') as f:
        f.write(CORRECT_SCREEN)
    print("✅ CaseIntakeScreen.tsx päivitetty expo-speech-recognition:lla")
    return True

if __name__ == '__main__':
    fix_screen_type()
    fix_screen_file()
    print("\n✅ Kaikki korjaukset tehty!")
