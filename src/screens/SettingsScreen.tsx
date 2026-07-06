import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, StatusBar, Alert, Modal, Share, TextInput,
} from 'react-native';
import { C, IS_IPAD } from '../utils/theme';
import { SessionManager, TIMEOUT_OPTIONS } from '../utils/sessionManager';
import { AuditLog, AuditEntry }            from '../utils/auditLog';
import { SecureStorage }                   from '../utils/secureStorage';
import { Storage }                         from '../utils/storage';
import { runIntegrityCheck, IntegrityReport } from '../utils/integrityCheck';

interface Props { onBack: () => void; isPro?: boolean; }

export default function SettingsScreen({ onBack, isPro = false }: Props) {
  const [timeoutMin,    setTimeoutMin]    = useState(15);
  const [auditEntries,  setAuditEntries]  = useState<AuditEntry[]>([]);
  const [intReport,     setIntReport]     = useState<IntegrityReport | null>(null);
  const [showAudit,     setShowAudit]     = useState(false);
  const [showIntReport, setShowIntReport] = useState(false);
  const [rotating,      setRotating]      = useState(false);
  const [scanning,      setScanning]      = useState(false);
  const [abuseIPDBKey,  setAbuseIPDBKey]  = useState('');
  const [greyNoiseKey,  setGreyNoiseKey]  = useState('');
  const [tracerfyKey,   setTracerfyKey]   = useState('');
  const [batchDataKey,  setBatchDataKey]  = useState('');
  const [shodanKey,     setShodanKey]     = useState('');
  const [showApiKeys,   setShowApiKeys]   = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [tm, entries, settings] = await Promise.all([
      SessionManager.getTimeoutMinutes(),
      AuditLog.getRecent(100),
      Storage.getSettings(),
    ]);
    setTimeoutMin(tm);
    setAuditEntries(entries);
    if (settings.abuseIPDBKey)  setAbuseIPDBKey(settings.abuseIPDBKey as string);
    if (settings.greyNoiseKey)  setGreyNoiseKey(settings.greyNoiseKey as string);
    if (settings.tracerfyKey)   setTracerfyKey(settings.tracerfyKey as string);
    if (settings.batchDataKey)  setBatchDataKey(settings.batchDataKey as string);
    if (settings.shodanKey)     setShodanKey(settings.shodanKey as string);
  };

  const handleSetTimeout = async (min: number) => {
    setTimeoutMin(min);
    await SessionManager.setTimeoutMinutes(min);
    Alert.alert('✓ Saved', min === 0 ? 'Auto-lock disabled.' : `Session will lock after ${min} minute${min !== 1 ? 's' : ''} of inactivity.`);
  };

  const handleRunIntegrity = async () => {
    setScanning(true);
    const report = await runIntegrityCheck();
    setIntReport(report);
    setShowIntReport(true);
    setScanning(false);
  };

  const handleRotateKeys = () => {
    Alert.alert(
      'Rotate Encryption Keys',
      'This generates new AES-256 keys and re-encrypts all stored data. The process takes a few seconds. Do not close the app during rotation.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Rotate Keys', onPress: async () => {
          setRotating(true);
          try {
            await SecureStorage.rotateKeys();
            await AuditLog.log('KEY_ROTATION', 'Manual key rotation completed');
            Alert.alert('✓ Keys Rotated', 'All data has been re-encrypted with new keys.');
          } catch (e: any) {
            Alert.alert('Rotation Failed', e.message);
          }
          setRotating(false);
        }},
      ]
    );
  };

  const handleExportAudit = async () => {
    try {
      const json = await AuditLog.exportJSON();
      await Share.share({
        message: json,
        title:   'Sentinel Audit Log',
      });
    } catch {
      Alert.alert('Export Failed', 'Could not export audit log.');
    }
  };

  const handleWipeAll = () => {
    Alert.alert(
      '⛔ Wipe All Data',
      'This will permanently delete ALL cases, notes, search history, and settings from this device. This action cannot be undone.\n\nEncryption keys will remain in the Secure Enclave.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Wipe Everything', style: 'destructive', onPress: async () => {
          Alert.alert(
            'Final Confirmation',
            'Are you absolutely sure? All investigative data will be destroyed.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Yes, Wipe All Data', style: 'destructive', onPress: async () => {
                await Storage.wipeAll();
                Alert.alert('✓ Wiped', 'All application data has been securely deleted.');
              }},
            ]
          );
        }},
      ]
    );
  };

  const handleSaveAPIKeys = async () => {
    await Storage.saveSetting('abuseIPDBKey', abuseIPDBKey.trim());
    await Storage.saveSetting('greyNoiseKey', greyNoiseKey.trim());
    await Storage.saveSetting('tracerfyKey',  tracerfyKey.trim());
    await Storage.saveSetting('batchDataKey', batchDataKey.trim());
    await Storage.saveSetting('shodanKey',    shodanKey.trim());
    await AuditLog.log('SETTINGS_CHANGE', 'API keys updated');
    Alert.alert('✓ Saved', 'API keys saved securely on this device.');
  };

  const scoreColor = (score: number) => score >= 85 ? C.green : score >= 60 ? C.amber : C.red;
  const levelIcon  = (level: string) => level === 'secure' ? '✅' : level === 'warning' ? '⚠️' : '⛔';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.topBar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <Text style={s.title}>🔐 Security Settings</Text>
      </View>

      <ScrollView contentContainerStyle={[s.content, IS_IPAD && s.iPadContent]}>

        {/* ── Encryption Status ─────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Encryption</Text>
        <View style={s.card}>
          <Row icon="🔒" label="Data Encryption" value="AES-256 + HMAC-SHA256" valueColor={C.green} />
          <Row icon="🗝️" label="Key Storage"      value={IS_IPAD ? 'iOS Keychain (Secure Enclave)' : 'iOS Keychain / Android Keystore'} valueColor={C.green} />
          <Row icon="🛡️" label="Key Accessibility" value="After first unlock, this device only" />
          <Row icon="📋" label="Envelope Format"   value="IV + Ciphertext + HMAC (encrypt-then-MAC)" />
        </View>

        <TouchableOpacity
          style={[s.actionBtn, { borderColor: C.purple, backgroundColor: C.purpleDim }, rotating && s.btnDisabled]}
          onPress={handleRotateKeys}
          disabled={rotating}
        >
          <Text style={[s.actionBtnText, { color: C.purple }]}>
            {rotating ? '⏳ Rotating keys…' : '🔄 Rotate Encryption Keys'}
          </Text>
          <Text style={s.actionBtnSub}>Generates new AES-256 keys and re-encrypts all data</Text>
        </TouchableOpacity>

        {/* ── Session Timeout ───────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Auto-Lock Timeout</Text>
        <View style={s.card}>
          {TIMEOUT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[s.timeoutRow, timeoutMin === opt.value && s.timeoutRowActive]}
              onPress={() => handleSetTimeout(opt.value)}
            >
              <Text style={[s.timeoutLabel, timeoutMin === opt.value && s.timeoutLabelActive]}>
                {opt.label}
              </Text>
              {timeoutMin === opt.value && <Text style={s.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.hint}>Session locks automatically after the chosen period of inactivity. Keys are wiped from memory when the app is backgrounded.</Text>

        {/* ── Device Integrity ─────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Device Integrity</Text>
        <TouchableOpacity
          style={[s.actionBtn, { borderColor: C.accent, backgroundColor: C.accentDim }, scanning && s.btnDisabled]}
          onPress={handleRunIntegrity}
          disabled={scanning}
        >
          <Text style={[s.actionBtnText, { color: C.accent }]}>
            {scanning ? '⏳ Scanning…' : '🔍 Run Security Scan'}
          </Text>
          <Text style={s.actionBtnSub}>Jailbreak detection, OS version, device passcode, debug mode</Text>
        </TouchableOpacity>

        {intReport && (
          <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: scoreColor(intReport.score) }]}>
            <View style={s.scoreRow}>
              <Text style={s.scoreLabel}>Security Score</Text>
              <Text style={[s.scoreValue, { color: scoreColor(intReport.score) }]}>{intReport.score}/100</Text>
            </View>
            <View style={[s.levelBadge, { backgroundColor: scoreColor(intReport.score) + '22' }]}>
              <Text style={[s.levelText, { color: scoreColor(intReport.score) }]}>
                {levelIcon(intReport.level)} {intReport.level.toUpperCase()}
              </Text>
            </View>
            {intReport.flags.map((f, i) => (
              <View key={i} style={s.flagRow}>
                <Text style={s.flagIcon}>{f.passed ? '✅' : f.severity === 'critical' ? '⛔' : '⚠️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.flagCheck, !f.passed && { color: f.severity === 'critical' ? C.red : C.amber }]}>{f.check}</Text>
                  {f.detail && <Text style={s.flagDetail}>{f.detail}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Audit Log ────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Audit Log</Text>
        <View style={s.card}>
          <Row icon="📝" label="Entries stored"   value={`${auditEntries.length} (max 500)`} />
          <Row icon="🔗" label="Integrity"         value="HMAC chain (tamper-evident)" valueColor={C.green} />
          <Row icon="🔒" label="Storage"           value="AES-256 encrypted" valueColor={C.green} />
        </View>

        <View style={s.rowBtns}>
          <TouchableOpacity style={[s.halfBtn, { borderColor: C.accent, backgroundColor: C.accentDim }]} onPress={() => setShowAudit(true)}>
            <Text style={[s.halfBtnText, { color: C.accent }]}>👁 View Log</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.halfBtn, { borderColor: C.purple, backgroundColor: C.purpleDim }]} onPress={handleExportAudit}>
            <Text style={[s.halfBtnText, { color: C.purple }]}>↑ Export</Text>
          </TouchableOpacity>
        </View>

        {/* ── API Keys ─────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>API Keys</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.timeoutRow} onPress={() => setShowApiKeys(!showApiKeys)}>
            <Text style={s.timeoutLabel}>🔑 Configure API Keys</Text>
            <Text style={{ color: C.accent }}>{showApiKeys ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showApiKeys && (
            <View style={{ padding: 14 }}>
              <Text style={s.apiLabel}>AbuseIPDB API Key</Text>
              <Text style={s.apiHint}>Free at abuseipdb.com — 1,000 checks/day</Text>
              <TextInput
                style={s.apiInput}
                value={abuseIPDBKey}
                onChangeText={setAbuseIPDBKey}
                placeholder="Paste your AbuseIPDB key"
                placeholderTextColor={C.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={true}
              />
              <Text style={s.apiLabel}>GreyNoise API Key</Text>
              <Text style={s.apiHint}>Free community tier at greynoise.io</Text>
              <TextInput
                style={s.apiInput}
                value={greyNoiseKey}
                onChangeText={setGreyNoiseKey}
                placeholder="Paste your GreyNoise key"
                placeholderTextColor={C.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={true}
              />
              {isPro && (<><Text style={[s.apiLabel, { marginTop: 16, color: C.accent }]}>PRO — Paid API Keys</Text>
              <Text style={[s.apiHint, { marginBottom: 12 }]}>These keys unlock additional Pro data sources. Costs apply per search.</Text>

              <Text style={s.apiLabel}>Tracerfy API Key</Text>
              <Text style={s.apiHint}>$0.02/search — skip trace & people search at tracerfy.com</Text>
              <TextInput
                style={s.apiInput}
                value={tracerfyKey}
                onChangeText={setTracerfyKey}
                placeholder="Paste your Tracerfy key"
                placeholderTextColor={C.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={true}
              />

              <Text style={s.apiLabel}>BatchData API Key</Text>
              <Text style={s.apiHint}>Phone & address intelligence at batchdata.io</Text>
              <TextInput
                style={s.apiInput}
                value={batchDataKey}
                onChangeText={setBatchDataKey}
                placeholder="Paste your BatchData key"
                placeholderTextColor={C.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={true}
              />

              <Text style={s.apiLabel}>Shodan API Key</Text>
              <Text style={s.apiHint}>Network intelligence & device search at shodan.io</Text>
              <TextInput
                style={s.apiInput}
                value={shodanKey}
                onChangeText={setShodanKey}
                placeholder="Paste your Shodan key"
                placeholderTextColor={C.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={true}
              />

              </>)}
              <TouchableOpacity style={[s.actionBtn, { borderColor: C.green, backgroundColor: C.greenDim, marginBottom: 0 }]} onPress={handleSaveAPIKeys}>
                <Text style={[s.actionBtnText, { color: C.green }]}>💾 Save API Keys</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Data Management ──────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Data Management</Text>
        <View style={s.card}>
          <Row icon="📱" label="Storage location"  value="Local device only" />
          <Row icon="☁️" label="Cloud sync"         value="Disabled" valueColor={C.green} />
          <Row icon="📡" label="Telemetry"          value="None" valueColor={C.green} />
          <Row icon="🌐" label="Network access"     value="External links only (browser)" />
        </View>

        <TouchableOpacity style={[s.actionBtn, { borderColor: C.red, backgroundColor: C.redDim }]} onPress={handleWipeAll}>
          <Text style={[s.actionBtnText, { color: C.red }]}>⛔ Wipe All Data</Text>
          <Text style={s.actionBtnSub}>Permanently deletes all cases, notes, and history from this device</Text>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Audit Log Modal */}
      <Modal visible={showAudit} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, IS_IPAD && s.iPadModal]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Audit Log</Text>
              <TouchableOpacity onPress={() => setShowAudit(false)}>
                <Text style={s.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }}>
              {auditEntries.length === 0 && <Text style={s.emptyText}>No audit entries yet.</Text>}
              {auditEntries.map((e, i) => (
                <View key={i} style={s.auditRow}>
                  <View style={s.auditLeft}>
                    <Text style={s.auditType}>{e.type.replace(/_/g, ' ')}</Text>
                    {e.detail && <Text style={s.auditDetail} numberOfLines={2}>{e.detail}</Text>}
                  </View>
                  <Text style={s.auditTime}>{e.timestamp.split(',')[1]?.trim() || e.timestamp}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowAudit(false)}>
              <Text style={s.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const Row = ({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) => (
  <View style={s.infoRow}>
    <Text style={s.infoIcon}>{icon}</Text>
    <View style={{ flex: 1 }}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  </View>
);

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },
  topBar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: IS_IPAD ? 16 : 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:    { marginRight: 10 },
  backText:   { color: C.accent, fontSize: 28, lineHeight: 28 },
  title:      { flex: 1, color: C.text, fontWeight: '700', fontSize: IS_IPAD ? 20 : 17 },
  content:    { padding: 16 },
  iPadContent:{ paddingHorizontal: 48, maxWidth: 760, alignSelf: 'center', width: '100%' },
  sectionTitle: { color: C.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 20 },
  card:       { backgroundColor: C.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  infoIcon:   { fontSize: 18, marginRight: 12, marginTop: 1 },
  infoLabel:  { color: C.textDim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  infoValue:  { color: C.text, fontSize: IS_IPAD ? 14 : 13 },
  actionBtn:  { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12 },
  actionBtnText: { fontWeight: '700', fontSize: IS_IPAD ? 16 : 15, marginBottom: 4 },
  actionBtnSub:  { color: C.textDim, fontSize: 12, lineHeight: 17 },
  btnDisabled:   { opacity: 0.5 },
  hint:       { color: C.textDim, fontSize: 12, lineHeight: 18, marginBottom: 4, paddingHorizontal: 2 },
  timeoutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  timeoutRowActive: { backgroundColor: C.accentDim },
  timeoutLabel: { color: C.text, fontSize: IS_IPAD ? 15 : 14 },
  timeoutLabelActive: { color: C.accent, fontWeight: '600' },
  checkmark:  { color: C.accent, fontSize: 16, fontWeight: '700' },
  scoreRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  scoreLabel: { color: C.textMid, fontSize: 13 },
  scoreValue: { fontSize: 24, fontWeight: '900' },
  levelBadge: { marginHorizontal: 14, marginBottom: 12, borderRadius: 8, padding: 8, alignItems: 'center' },
  levelText:  { fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  flagRow:    { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: C.border },
  flagIcon:   { fontSize: 16, marginRight: 10, marginTop: 1 },
  flagCheck:  { color: C.text, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  flagDetail: { color: C.textDim, fontSize: 12, lineHeight: 17 },
  rowBtns:    { flexDirection: 'row', gap: 12, marginBottom: 12 },
  halfBtn:    { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  halfBtnText:{ fontWeight: '700', fontSize: IS_IPAD ? 15 : 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  modalCard:  { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  iPadModal:  { marginHorizontal: 80, borderRadius: 24, marginBottom: 48 },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: C.text, fontWeight: '700', fontSize: IS_IPAD ? 20 : 18 },
  closeX:     { color: C.textDim, fontSize: 22, padding: 4 },
  auditRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  auditLeft:  { flex: 1, marginRight: 12 },
  auditType:  { color: C.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  auditDetail:{ color: C.textMid, fontSize: 12 },
  auditTime:  { color: C.textDim, fontSize: 11 },
  emptyText:  { color: C.textDim, textAlign: 'center', padding: 24 },
  apiLabel:   { color: C.textMid, fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 12 },
  apiHint:    { color: C.textDim, fontSize: 11, marginBottom: 8 },
  apiInput:   { backgroundColor: C.bg, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 12, color: C.text, fontSize: 13, marginBottom: 4 },
  modalCloseBtn:    { backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  modalCloseBtnText:{ color: C.textMid, fontWeight: '600' },
});
