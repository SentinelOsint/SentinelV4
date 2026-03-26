/**
 * SENTINEL – Professional OSINT Toolkit
 * North America Edition v2.2 – Security Update
 *
 * New in v2.2:
 * – AES-256 + HMAC-SHA256 encrypted storage
 * – Keys in iOS Keychain / Android Keystore
 * – Session timeout with automatic re-authentication
 * – Memory wipe on app backgrounding
 * – Device integrity checks (jailbreak, debug, OS version)
 * – Failed auth tracking with exponential lockout
 * – Encrypted audit log with HMAC chain
 * – Key rotation support
 * – Security Settings screen
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator,
  Alert, Linking, Animated, Modal, Share, Clipboard,
  AppState,
} from 'react-native';

import LockScreen     from './src/screens/LockScreen';
import CasesScreen    from './src/screens/CasesScreen';
import MapScreen      from './src/screens/MapScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OneInputScreen from './src/screens/OneInputScreen';
import { analyzeResults } from './src/utils/aiEngine';
import TimelineScreen from './src/screens/TimelineScreen';
import UpgradeScreen from './src/screens/UpgradeScreen';
import WatchListScreen from './src/screens/WatchListScreen';

import { Storage, Trial, SubscriptionTier } from './src/utils/storage';
import { exportSearchPDF } from './src/utils/pdfExport';
import { SessionManager }  from './src/utils/sessionManager';
import { AuditLog }        from './src/utils/auditLog';
import * as SplashScreen   from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();
import {
  C, NOTE_TAGS, IS_IPAD, CARD_WIDTH, GRID_GAP, GRID_PADDING,
} from './src/utils/theme';
import {
  getIPResults, getDomainResults, getSocialResults, getPersonResults,
  getPhoneResults, getEmailResults, getCompanyResults, getVehicleResults,
  getGeoResults, getImageResults, getBreachResults, getCourtResults,
} from './src/utils/osintEngines';
import { Screen, OsintResult, FieldNote, HistoryItem } from './src/types';

export default function App() {
  const [unlocked,      setUnlocked]      = useState(false);
  const [needsReauth,   setNeedsReauth]   = useState(false);
  const [isPro,         setIsPro]         = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('trial');
  const [screen,        setScreen]        = useState<Screen>('home');
  const [loading,       setLoading]       = useState(false);
  const [results,       setResults]       = useState<OsintResult[]>([]);
  const [input,         setInput]         = useState('');
  const [input2,        setInput2]        = useState('');
  const [notes,         setNotes]         = useState<FieldNote[]>([]);
  const [history,       setHistory]       = useState<HistoryItem[]>([]);
  const [noteText,      setNoteText]      = useState('');
  const [noteTag,       setNoteTag]       = useState('General');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [activeCaseId,  setActiveCaseId]  = useState<string | null>(null);
  const [exporting,     setExporting]     = useState(false);
  const [curModule,     setCurModule]     = useState('');
  const [curQuery,      setCurQuery]      = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const appState = useRef(AppState.currentState);

  // ── Session management ────────────────────────────────────────────────────
  const handleLock = useCallback(() => {
    setUnlocked(false);
    setNeedsReauth(true);
    // Clear sensitive in-memory state
    setResults([]);
    setInput('');
    setInput2('');
    setNotes([]);
    setHistory([]);
  }, []);

  useEffect(() => {
    if (unlocked) {
      Trial.initialize().then(async () => {
      const tier = await Trial.getSubscriptionTier();
      setSubscriptionTier(tier);
      setIsPro(tier === 'pro');
    });
      // Initialize session manager with lock callback
      SessionManager.initialize(handleLock);
      loadData();
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
      SplashScreen.hideAsync();
    }
    return () => {
      if (!unlocked) SessionManager.teardown();
    };
  }, [unlocked]);

  // Refresh session timer on any user interaction
  const onUserInteraction = () => {
    if (unlocked) SessionManager.touch();
  };

  const loadData = async () => {
    const [h, n, settings] = await Promise.all([
      Storage.getHistory(),
      Storage.getNotes(),
      Storage.getSettings(),
    ]);
    setHistory(h);
    setNotes(n);
    if (settings.activeCaseId) setActiveCaseId(settings.activeCaseId as string);
  };

  // ── AppState / Biometric re-auth ─────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/active/) && nextState === 'background') {
        // App going to background – start lock timer
        appState.current = nextState;
      } else if (appState.current.match(/inactive|background/) && nextState === 'active') {
        // App coming to foreground – require re-auth if session active
        appState.current = nextState;
        if (unlocked) {
          setNeedsReauth(true);
          setUnlocked(false);
        }
      } else {
        appState.current = nextState;
      }
    });
    return () => sub.remove();
  }, [unlocked]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const fadeSwap = () => Animated.sequence([
    Animated.timing(fadeAnim, { toValue: 0, duration: 150,  useNativeDriver: true }),
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
  ]).start();

  const navigate = (s: Screen) => {
    onUserInteraction();
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setScreen(s); setResults([]); setInput(''); setInput2('');
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
  };
  const goHome = () => navigate('home');

  // ── Clipboard ─────────────────────────────────────────────────────────────
  const copyToClipboard = (text: string) => {
    try {
      Clipboard.setString(text);
      Alert.alert('Copied', text.length > 80 ? text.slice(0, 80) + '…' : text);
    } catch { Alert.alert('Value', text); }
  };

  // ── Active case ───────────────────────────────────────────────────────────
  const handleSetActiveCase = async (id: string | null) => {
    onUserInteraction();
    setActiveCaseId(id);
    await Storage.saveSetting('activeCaseId', id);
    if (id) Alert.alert('Active Case Set', 'Searches will be linked to this case.');
  };

  // ── History & Notes ───────────────────────────────────────────────────────
  const addToHistory = async (module: string, query: string) => {
    const item: HistoryItem = {
      id: Date.now().toString(), module, query,
      timestamp: new Date().toLocaleString('en-US'),
      caseId: activeCaseId || undefined,
    };
    const updated = [item, ...history].slice(0, 200);
    setHistory(updated);
    await Storage.addHistory(item); // also logs to AuditLog internally

    if (activeCaseId) {
      const cases = await Storage.getCases();
      await Storage.saveCases(cases.map(c =>
        c.id === activeCaseId
          ? { ...c, searches: [item, ...c.searches], updatedAt: new Date().toLocaleString('en-US') }
          : c
      ));
    }
  };

  const saveNote = async () => {
    if (!noteText.trim()) return;
    const note: FieldNote = {
      id: Date.now().toString(), text: noteText.trim(), tag: noteTag,
      timestamp: new Date().toLocaleString('en-US'),
    };
    const updated = [note, ...notes];
    setNotes(updated);
    await Storage.saveNotes(updated);
    await AuditLog.log('NOTE_CREATE', `Tag: ${noteTag}`);

    if (activeCaseId) {
      const cases = await Storage.getCases();
      await Storage.saveCases(cases.map(c =>
        c.id === activeCaseId
          ? { ...c, notes: [note, ...c.notes], updatedAt: new Date().toLocaleString('en-US') }
          : c
      ));
    }
    setNoteText(''); setShowNoteModal(false);
    Alert.alert('✓ Saved', activeCaseId ? 'Note saved and linked to active case.' : 'Note saved.');
  };

  const deleteNote = async (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    await Storage.saveNotes(updated);
    await AuditLog.log('NOTE_DELETE');
  };

  const clearHistory = () => {
    Alert.alert('Clear History', 'Remove all search history from this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        setHistory([]);
        await Storage.clearHistory();
      }},
    ]);
  };

  // ── Share / Export ────────────────────────────────────────────────────────
  const shareResults = async () => {
    const text = results.filter(r => r.type !== 'info').map(r => r.value ? `${r.label}: ${r.value}` : r.label).join('\n');
    await Share.share({ message: `SENTINEL – ${curModule}\nQuery: ${curQuery}\n${'─'.repeat(28)}\n${text}` });
  };

  const exportPDF = async () => {
    if (!results.length) return;
    setExporting(true);
    try { await exportSearchPDF(curModule, curQuery, results); }
    catch { Alert.alert('Error', 'PDF export failed.'); }
    setExporting(false);
  };

  const quickNote = (v: string) => { setNoteText(v); setShowNoteModal(true); };

  // ── Search runner ─────────────────────────────────────────────────────────
  const run = async (module: string, query: string, fn: () => Promise<OsintResult[]> | OsintResult[]) => {
    if (!query.trim()) { Alert.alert('Required', 'Enter a value to search.'); return; }
    onUserInteraction();
    setLoading(true); setResults([]); setCurModule(module); setCurQuery(query.trim());
    try { setResults(await fn()); addToHistory(module, query.trim()); }
    catch (e: any) { Alert.alert('Error', e.message || 'Search failed'); }
    setLoading(false);
  };

  // ── AI Analysis ──────────────────────────────────────────────────────────
  const analyzeWithAI = async (module: string, query: string, results: OsintResult[]) => {
    try {
      setLoading(true);
      const analysis = await analyzeResults(module, query, results);
      setScreen('home');
      setTimeout(() => Alert.alert('AI Analysis', analysis), 300);
    } catch (e: any) {
      Alert.alert('AI Error', e.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };
  const searchIP      = () => run('IP & Network',    input, async () => { const r = await fetch(`https://ipapi.co/${input.trim()}/json/`); const d = await r.json(); if (d.error) throw new Error(d.reason); return getIPResults(d); });
  const searchDomain  = () => run('Domain & WHOIS',  input, async () => { const q = input.trim().replace(/^https?:\/\//,'').split('/')[0]; const r = await fetch(`https://ipapi.co/${q}/json/`); const d = await r.json(); return getDomainResults(q, d); });
  const searchSocial  = () => run('Social Media',    input, () => getSocialResults(encodeURIComponent(input.trim())));
  const searchPerson  = () => run('Person Search',   input, () => getPersonResults(encodeURIComponent(input.trim()), input2.trim() ? '+' + encodeURIComponent(input2.trim()) : '', isPro));
  const searchPhone   = () => run('Phone Lookup',    input, () => getPhoneResults(input.trim().replace(/[\s\-\(\)]/g, '')));
  const searchEmail   = () => { const q = input.trim().toLowerCase(); if (!q.includes('@')) { Alert.alert('Invalid', 'Enter a valid email.'); return; } run('Email Lookup', q, () => getEmailResults(q, q.split('@')[1])); };
  const searchCompany = () => run('Company / Org',   input, () => getCompanyResults(encodeURIComponent(input.trim())));
  const searchVehicle = () => run('Vehicle',         input, () => getVehicleResults(input.trim().toUpperCase(), encodeURIComponent(input.trim().toUpperCase())));
  const searchGeo     = () => run('Geo & Location',  input, () => getGeoResults(encodeURIComponent(input.trim()), input.trim()));
  const searchImage   = () => run('Image Analysis',  input, () => getImageResults(encodeURIComponent(input.trim()), input.trim()));
  const searchBreach  = () => run('Data Breaches',   input, () => getBreachResults(encodeURIComponent(input.trim())));
  const searchCourt   = () => run('Court Records',   input, () => getCourtResults(encodeURIComponent(input.trim())));

  // ════════════════════════════════════════════════════════════════════════
  // SPECIAL SCREENS
  // ════════════════════════════════════════════════════════════════════════

  if (!unlocked) return (
  <LockScreen
   onUnlock={() => { setUnlocked(true); setNeedsReauth(false); }}
   isReauth={needsReauth}
   />
  );
  const wrapAnimated = (child: React.ReactElement) => (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>{child}</Animated.View>
  );
  if (screen === 'cases')    return wrapAnimated(<CasesScreen onBack={goHome} activeCaseId={activeCaseId} onSetActiveCase={handleSetActiveCase} />);
  if (screen === 'geo_map')  return wrapAnimated(<MapScreen onBack={goHome} onSaveNote={(t) => { setNoteText(t); setShowNoteModal(true); }} />);
  if (screen === 'settings') return wrapAnimated(<SettingsScreen onBack={goHome} />);
  if (screen === 'one_input') return wrapAnimated(<OneInputScreen isPro={isPro} onBack={goHome} />);
  if (screen === 'timeline') return wrapAnimated(<TimelineScreen isPro={isPro} onBack={goHome} />);
  if (screen === 'upgrade') return wrapAnimated(<UpgradeScreen onBack={goHome} onSubscribe={async (tier) => { await Trial.setSubscription(tier); setSubscriptionTier(tier); setIsPro(tier === 'pro'); goHome(); }} />);
  if (screen === 'watchlist') return wrapAnimated(<WatchListScreen isPro={isPro} onBack={goHome} />);
  // ── Note modal component ──────────────────────────────────────────────────
  const NoteModal = () => (
    <Modal visible={showNoteModal} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={[s.modalCard, IS_IPAD && s.iPadModal]}>
          <Text style={s.modalTitle}>Save to Field Notes</Text>
          {activeCaseId && <Text style={s.modalCaseHint}>Also saves to active case.</Text>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {NOTE_TAGS.map(t => (
              <TouchableOpacity key={t} onPress={() => setNoteTag(t)} style={[s.tagChip, noteTag === t && s.tagActive]}>
                <Text style={[s.tagText, noteTag === t && s.tagTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput style={s.noteInput} value={noteText} onChangeText={setNoteText} placeholder="Enter observation…" placeholderTextColor={C.textDim} multiline numberOfLines={5} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.card }]} onPress={() => setShowNoteModal(false)}>
              <Text style={{ color: C.textMid }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.accent, flex: 1 }]} onPress={saveNote}>
              <Text style={{ color: C.bg, fontWeight: '800' }}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ── Notes screen ──────────────────────────────────────────────────────────
  if (screen === 'notes') return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.topBar}>
        <TouchableOpacity onPress={goHome} style={s.backBtn}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <Text style={s.screenTitle}>📋 Field Notes</Text>
        <TouchableOpacity onPress={() => { setNoteText(''); setShowNoteModal(true); }} style={s.hBtn}>
          <Text style={s.hBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={[s.sub, IS_IPAD && s.iPadSub]} onTouchStart={onUserInteraction}>
        {notes.length === 0 && <Text style={s.empty}>No notes yet. Tap + Add or long-press any result.</Text>}
        {notes.map(n => (
          <View key={n.id} style={s.noteCard}>
            <View style={s.noteTop}>
              <View style={s.noteBadge}><Text style={s.noteBadgeText}>{n.tag}</Text></View>
              <Text style={s.noteTime}>{n.timestamp}</Text>
            </View>
            <Text style={s.noteText}>{n.text}</Text>
            <TouchableOpacity onPress={() => deleteNote(n.id)}><Text style={s.deleteTxt}>Delete</Text></TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <NoteModal />
    </SafeAreaView>
  );

  // ── History screen ────────────────────────────────────────────────────────
  if (screen === 'history') return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.topBar}>
        <TouchableOpacity onPress={goHome} style={s.backBtn}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <Text style={s.screenTitle}>🕐 Search History</Text>
        <TouchableOpacity onPress={clearHistory} style={s.hBtn}><Text style={[s.hBtnText, { color: C.red }]}>Clear</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={[s.sub, IS_IPAD && s.iPadSub]} onTouchStart={onUserInteraction}>
        {history.length === 0 && <Text style={s.empty}>No search history.</Text>}
        {history.map(h => (
          <View key={h.id} style={s.histRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.histModule}>{h.module}</Text>
              <Text style={s.histQuery}>{h.query}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {h.caseId && <Text style={{ fontSize: 14, marginBottom: 2 }}>📁</Text>}
              <Text style={s.histTime}>{h.timestamp}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );

  // ════════════════════════════════════════════════════════════════════════
  // HOME
  // ════════════════════════════════════════════════════════════════════════
  if (screen === 'home') {
    const modules = [
      { id: 'one_input', icon: '🎯', title: 'One-Input Search', desc: 'One query — full intelligence report' },
      { id: 'person',   icon: '👤', title: 'Person Search',  desc: 'Name, background, profiles' },
      { id: 'phone',    icon: '📞', title: 'Phone Lookup',   desc: 'Owner, spam, carrier' },
      { id: 'email',    icon: '✉️',  title: 'Email Lookup',   desc: 'Breaches, owner, domain' },
      { id: 'social',   icon: '📱', title: 'Social Media',   desc: 'Username on 25+ platforms' },
      { id: 'ip',       icon: '🌐', title: 'IP & Network',   desc: 'Location, ISP, threat intel' },
      { id: 'domain',   icon: '🔗', title: 'Domain & WHOIS', desc: 'DNS, registration, history' },
      { id: 'company',  icon: '🏢', title: 'Company / Org',  desc: 'SEC, state regs, finance' },
      { id: 'vehicle',  icon: '🚗', title: 'Vehicle',        desc: 'Plate, VIN, history' },
      { id: 'court',    icon: '⚖️',  title: 'Court Records', desc: 'PACER, state, criminal' },
      { id: 'geo',      icon: '📍', title: 'Geo / OSINT',   desc: 'Satellite, flights, vessels' },
      { id: 'geo_map',  icon: '🗺️', title: 'Map View',       desc: 'Pin locations, field map' },
      { id: 'image',    icon: '🖼️', title: 'Image Analysis', desc: 'EXIF, reverse search, AI' },
      { id: 'breach',   icon: '🔓', title: 'Data Breaches',  desc: 'Pwned, dark web, pastes' },
      { id: 'cases',    icon: '📁', title: 'Cases',          desc: 'Manage investigations' },
      { id: 'timeline', icon: '🕐', title: 'Investigation Timeline', desc: 'Auto-generated activity log' },
      { id: 'watchlist', icon: '👁️', title: 'Watch List', desc: 'Monitor targets for changes' },
      { id: 'notes',    icon: '📋', title: 'Field Notes',    desc: `${notes.length} saved` },
      { id: 'history',  icon: '🕐', title: 'History',        desc: `${history.length} queries` },
      { id: 'settings', icon: '🔐', title: 'Security',       desc: 'Encryption & audit log' },
      { id: 'upgrade', icon: '⭐', title: 'Upgrade to Pro', desc: 'Plans & pricing' },
    ];
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <View style={s.homeHeader}>
            <View>
              <Text style={s.logo}>SENTINEL</Text>
              <Text style={s.logoSub}>OSINT FIELD TOOLKIT · NA v2.4{IS_IPAD ? ' · iPad' : ''}</Text>
              <Text style={s.aiPowered}>✦ Searches FBI · Interpol · 50 States · Canada</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {activeCaseId && <View style={s.caseDot}><Text>📁</Text></View>}
              <View style={s.statusDot} />
            </View>
          </View>
          <View style={s.disclaimer}>
            <Text style={s.disclaimerTxt}>⚖️ Not a CRA. Not for employment/credit/tenant screening.</Text>
          </View>
          {activeCaseId && (
            <TouchableOpacity style={s.activeBanner} onPress={() => navigate('cases')}>
              <Text style={s.activeBannerTxt}>🔴 Active case – searches are being logged  ›</Text>
            </TouchableOpacity>
          )}
          <ScrollView
            contentContainerStyle={[s.grid, { paddingHorizontal: GRID_PADDING, gap: GRID_GAP }]}
            showsVerticalScrollIndicator={false}
            onTouchStart={onUserInteraction}
          >
            {/* Recently Searched */}
            {history.length > 0 && (
              <View style={[s.recentBox, { width: '100%' }]}>
                <Text style={s.recentTitle}>🕐 Recently Searched</Text>
                <View style={s.recentChips}>
                  {history.slice(0, 3).map((h, i) => (
                    <TouchableOpacity
                      key={i}
                      style={s.recentChip}
                      onPress={() => { setInput(h.query); navigate(h.module.toLowerCase().replace(' ', '_') as Screen); }}
                    >
                      <Text style={s.recentChipTxt} numberOfLines={1}>{h.query}</Text>
                      <Text style={s.recentChipMod}>{h.module}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {modules.map(m => {
              const isOneInput = m.id === 'one_input';
              const isSettings = m.id === 'settings';
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    s.moduleCard,
                    { width: isOneInput ? '100%' : CARD_WIDTH },
                    isSettings && s.securityCard,
                    isOneInput && s.oneInputCard,
                  ]}
                  onPress={() => navigate(m.id as Screen)}
                  activeOpacity={0.72}
                >
                  {isOneInput && (
                    <View style={s.oneInputBadge}>
                      <Text style={s.oneInputBadgeTxt}>⚡ FASTEST SEARCH</Text>
                    </View>
                  )}
                  <Text style={[s.moduleIcon, isOneInput && { fontSize: IS_IPAD ? 40 : 32 }]}>{m.icon}</Text>
                  <Text style={[s.moduleTitle, isOneInput && s.oneInputTitle]}>{m.title}</Text>
                  <Text style={[s.moduleDesc, isOneInput && s.oneInputDesc]}>{m.desc}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 24, width: '100%' }} />
          </ScrollView>
        </Animated.View>
        <NoteModal />
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // OSINT SEARCH SCREENS
  // ════════════════════════════════════════════════════════════════════════
  const cfgs: Record<string, { title: string; ph: string; ph2?: string; btn: string; action: () => void; hint?: string; tips?: string[] }> = {
    person:  { title: '👤 Person Search',   ph: 'Full name',                     ph2: 'City, State (optional)',  btn: 'Search Person',   action: searchPerson,  hint: 'Use quotes: "John Smith"',        tips: ['Full legal name gives best results', 'Add city/state to narrow results', 'Works best with uncommon names'] },
    phone:   { title: '📞 Phone Lookup',    ph: '+1 555 000 0000',               btn: 'Lookup Number',           action: searchPhone,   hint: 'Include country code (+1)',       tips: ['Include country code for best results', 'Checks spam databases & carrier info', 'Works for US and Canadian numbers'] },
    email:   { title: '✉️ Email Lookup',    ph: 'address@domain.com',            btn: 'Lookup Email',            action: searchEmail,   hint: 'Check breaches & owner info',     tips: ['Searches breach databases', 'Finds linked social accounts', 'Checks domain registration'] },
    social:  { title: '📱 Social Media',    ph: 'Username (no @)',                btn: 'Find Profiles',           action: searchSocial,  hint: 'Checked on 25+ platforms',       tips: ['Do not include @ symbol', 'Checks 25+ platforms simultaneously', 'Case-insensitive search'] },
    ip:      { title: '🌐 IP & Network',    ph: 'IP address (e.g. 8.8.8.8)',     btn: 'Lookup IP',               action: searchIP,      hint: 'IPv4 and IPv6 supported',         tips: ['Works with IPv4 and IPv6', 'Returns geolocation & ISP info', 'Checks threat intelligence feeds'] },
    domain:  { title: '🔗 Domain & WHOIS',  ph: 'example.com',                   btn: 'Lookup Domain',           action: searchDomain,  hint: 'Do not include https://',         tips: ['Enter domain without https://', 'Returns registration & DNS records', 'Checks domain reputation & history'] },
    company: { title: '🏢 Company / Org',   ph: 'Company name or EIN',           ph2: 'State (optional)',        btn: 'Search Company',  action: searchCompany, hint: 'SEC, state records & finance',   tips: ['Search by name or EIN/tax ID', 'Add state to narrow results', 'Checks SEC filings & state registrations'] },
    vehicle: { title: '🚗 Vehicle',         ph: 'License plate or VIN',          btn: 'Search Vehicle',          action: searchVehicle, hint: 'US and Canadian plates',          tips: ['US and Canadian plates supported', 'VIN returns full vehicle history', 'Plate format: ABC1234'] },
    court:   { title: '⚖️ Court Records',   ph: 'Name, company, or case number', ph2: 'State (optional)',        btn: 'Search Records',  action: searchCourt,   hint: 'PACER, state & criminal records', tips: ['Search by name, company, or case #', 'Add state to limit jurisdiction', 'Covers federal and state courts'] },
    geo:     { title: '📍 Geo / OSINT',     ph: 'Coordinates or address',        btn: 'Search Location',         action: searchGeo,     hint: '40.7128,-74.0060 or address',     tips: ['Enter GPS coords or street address', 'Returns satellite & aerial imagery', 'Checks flight & vessel tracking'] },
    image:   { title: '🖼️ Image Analysis',  ph: 'Image URL',                     btn: 'Analyze Image',           action: searchImage,   hint: 'EXIF, reverse search & AI',       tips: ['Paste a direct image URL', 'Extracts EXIF metadata', 'Runs reverse image search across engines'] },
    breach:  { title: '🔓 Data Breaches',   ph: 'Email, username, or domain',    btn: 'Check Breaches',          action: searchBreach,  hint: 'HaveIBeenPwned & dark web',       tips: ['Search by email, username, or domain', 'Checks HaveIBeenPwned & dark web', 'Returns breach dates & exposed data types'] },
  };

  const cfg = cfgs[screen];
  if (!cfg) return null;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.topBar}>
        <TouchableOpacity onPress={goHome} style={s.backBtn}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <Text style={s.screenTitle}>{cfg.title}</Text>
        {results.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8 }}>

            <TouchableOpacity onPress={shareResults} style={s.hBtn}>
              <Text style={s.hBtnText}>↑ Share</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={[s.sub, IS_IPAD && s.iPadSub]} keyboardShouldPersistTaps="handled" onTouchStart={onUserInteraction}>
          {activeCaseId && <View style={s.caseHint}><Text style={s.caseHintTxt}>📁 Searches logged to active case</Text></View>}
          {cfg.hint && <Text style={s.hint}>💡 {cfg.hint}</Text>}
          <TextInput style={s.input} placeholder={cfg.ph} placeholderTextColor={C.textDim} value={input} onChangeText={setInput} autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={cfg.action} />
          {cfg.ph2 && <TextInput style={s.input} placeholder={cfg.ph2} placeholderTextColor={C.textDim} value={input2} onChangeText={setInput2} autoCapitalize="none" autoCorrect={false} />}
          <TouchableOpacity style={s.searchBtn} onPress={cfg.action} disabled={loading}>
            {loading ? <ActivityIndicator color={C.bg} /> : <Text style={s.searchBtnTxt}>{cfg.btn}</Text>}
          </TouchableOpacity>
          {cfg.tips && results.length === 0 && !loading && (
            <View style={s.tipsBox}>
              <Text style={s.tipsTitle}>What you can find:</Text>
              {cfg.tips.map((t, i) => (
                <Text key={i} style={s.tipItem}>· {t}</Text>
              ))}
            </View>
          )}

          {results.length > 0 && (
            <TouchableOpacity
              style={s.aiBtn}
              onPress={() => {
                if (!isPro) { setScreen('upgrade'); return; }
                analyzeWithAI(screen, input, results);
              }}
            >
              <Text style={s.aiBtnText}>🤖  AI Analysis</Text>
              {!isPro && <Text style={s.aiBtnBadge}>PRO</Text>}
            </TouchableOpacity>
          )}
          {results.length > 0 && activeCaseId && (
            <TouchableOpacity
              style={s.caseAddBtn}
              onPress={() => {
                const summary = results.filter(r => r.type !== 'info').slice(0, 5).map(r => `${r.label}: ${r.value}`).join('\n');
                quickNote(`[${screen.toUpperCase()}] ${input}\n${summary}`);
              }}
            >
              <Text style={s.caseAddBtnTxt}>📁 Add to Active Case</Text>
            </TouchableOpacity>
          )}
          {results.length > 0 && (
            <TouchableOpacity
              style={s.pdfBtn}
              onPress={exportPDF}
              disabled={exporting}
            >
              <Text style={s.pdfBtnText}>{exporting ? '…' : '↓  Export PDF'}</Text>
              {!isPro && <Text style={s.aiBtnBadge}>PRO</Text>}
            </TouchableOpacity>
          )}
          {results.length > 0 && (
            <View style={s.resultsBox}>
              <View style={s.resultsTopBar}>
                <Text style={s.resultsLbl}>RESULTS</Text>
                <Text style={s.resultsCnt}>{results.filter(r => r.type !== 'info' && r.type !== 'warn').length} items</Text>
              </View>
              <Text style={s.lpHint}>Long-press any row → save to Field Notes</Text>
              {results.map((r, i) => {
                if (r.type === 'info') return <View key={i} style={s.secHeader}><Text style={s.secHeaderTxt}>{r.label}</Text></View>;
                if (r.type === 'warn') return <View key={i} style={s.warnRow}><Text style={{ fontSize: 18, marginRight: 10 }}>⚠️</Text><Text style={s.warnTxt}>{r.value}</Text></View>;
                return (
                  <TouchableOpacity key={i} style={[s.resultRow,
                    r.label?.includes('🚨') && s.resultRowAlert,
                    r.label?.includes('⚠️') && s.resultRowWarn,
                    r.label?.includes('✅') && s.resultRowOk,
                  ]}
                    onPress={() => { if (r.type === 'link') Linking.openURL(r.value); else if (r.type === 'copy') copyToClipboard(r.value); }}
                    onLongPress={() => quickNote(`${r.label}: ${r.value}`)}
                    activeOpacity={0.65}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.resultLbl,
                        r.label?.includes('🚨') && { color: C.red },
                        r.label?.includes('⚠️') && { color: C.amber },
                        r.label?.includes('✅') && { color: C.green },
                      ]}>{r.label}</Text>
                      {r.value ? <Text style={[s.resultVal, r.type === 'link' && s.linkTxt, r.type === 'copy' && s.copyTxt]} numberOfLines={2}>{r.type === 'link' ? '→ Open in browser' : r.value}</Text> : null}
                    </View>
                    {r.type === 'link' && <Text style={s.extIcon}>↗</Text>}
                    {r.type === 'copy' && <Text style={s.copyIcon}>⎘</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 48 }} />
        </ScrollView>
      </Animated.View>
      <NoteModal />
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },
  homeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: IS_IPAD ? 24 : 20, paddingTop: IS_IPAD ? 20 : 16, paddingBottom: IS_IPAD ? 14 : 10 },
  aiPowered:  { fontSize: IS_IPAD ? 10 : 8, color: C.textMid, letterSpacing: 1, marginTop: 2 },
  logo:       { fontSize: IS_IPAD ? 32 : 26, fontWeight: '900', color: C.accent, letterSpacing: IS_IPAD ? 5 : 4 },
  logoSub:    { fontSize: IS_IPAD ? 11 : 9, color: C.textDim, letterSpacing: 2, marginTop: 3 },
  statusDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: C.green, shadowColor: C.green, shadowRadius: 6, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 } },
  caseDot:    { backgroundColor: C.amberDim, borderRadius: 12, padding: 4 },
  disclaimer: { marginHorizontal: IS_IPAD ? 24 : 16, marginBottom: 10, backgroundColor: '#0d1a10', borderLeftWidth: 3, borderLeftColor: C.amber, borderRadius: 8, padding: IS_IPAD ? 12 : 10 },
  disclaimerTxt: { color: C.amber, fontSize: IS_IPAD ? 12 : 11 },
  activeBanner:  { marginHorizontal: IS_IPAD ? 24 : 16, marginBottom: 10, backgroundColor: C.redDim, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: C.red },
  activeBannerTxt: { color: C.red, fontSize: IS_IPAD ? 13 : 12, fontWeight: '600' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 4 },
  recentBox:      { backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  recentTitle:    { color: C.textMid, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  recentChips:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  recentChip:     { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.border, maxWidth: '45%' },
  recentChipTxt:  { color: C.text, fontSize: 12, fontWeight: '600' },
  recentChipMod:  { color: C.textDim, fontSize: 10, marginTop: 2 },
  oneInputCard: { borderTopColor: C.accent, borderTopWidth: 3, backgroundColor: C.accentDim },
  oneInputBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: C.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  oneInputBadgeTxt: { color: C.bg, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  oneInputTitle: { fontSize: IS_IPAD ? 20 : 17, color: C.accent },
  oneInputDesc: { color: C.textMid, fontSize: IS_IPAD ? 13 : 12 },
  moduleCard: { backgroundColor: C.card, borderRadius: IS_IPAD ? 16 : 14, padding: IS_IPAD ? 20 : 16, borderWidth: 1, borderColor: C.border, borderTopWidth: 2, borderTopColor: C.accent },
  securityCard: { borderColor: C.accentDim, backgroundColor: '#0a1520' },
  moduleIcon: { fontSize: IS_IPAD ? 32 : 26, marginBottom: IS_IPAD ? 10 : 8 },
  moduleTitle:{ color: C.text, fontWeight: '700', fontSize: IS_IPAD ? 16 : 14, marginBottom: 3 },
  moduleDesc: { color: C.textDim, fontSize: IS_IPAD ? 13 : 11, lineHeight: IS_IPAD ? 18 : 15 },
  topBar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: IS_IPAD ? 16 : 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:    { marginRight: 10, padding: 8, marginLeft: -8 },
  backText:   { color: C.accent, fontSize: 28, lineHeight: 28 },
  screenTitle:{ flex: 1, color: C.text, fontWeight: '700', fontSize: IS_IPAD ? 20 : 16 },
  hBtn:       { padding: 6 },
  hBtnText:   { color: C.accent, fontSize: IS_IPAD ? 15 : 13, fontWeight: '600' },
  sub:        { padding: IS_IPAD ? 20 : 16 },
  iPadSub:    { paddingHorizontal: IS_IPAD ? 48 : 16, maxWidth: 760, alignSelf: 'center', width: '100%' },
  caseHint:   { backgroundColor: C.redDim, borderRadius: 8, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: C.red },
  caseHintTxt:{ color: C.red, fontSize: IS_IPAD ? 12 : 11 },
  hint:       { color: C.textDim, fontSize: IS_IPAD ? 13 : 12, marginBottom: 12, fontStyle: 'italic' },
  input:      { backgroundColor: C.card, color: C.text, borderRadius: 12, paddingHorizontal: 16, paddingVertical: IS_IPAD ? 16 : 14, fontSize: IS_IPAD ? 16 : 15, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  searchBtn:  { backgroundColor: 'transparent', borderRadius: 12, padding: IS_IPAD ? 18 : 16, alignItems: 'center', marginBottom: 20, borderWidth: 1.5, borderColor: C.accent },
  searchBtnTxt:{ color: C.accent, fontWeight: '800', fontSize: IS_IPAD ? 17 : 16, letterSpacing: 0.5 },
  tipsBox:   { backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: C.accent },
  tipsTitle: { color: C.accent, fontWeight: '700', fontSize: 13, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  tipItem:   { color: C.textDim, fontSize: 14, lineHeight: 22 },
  caseAddBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1f0d', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.green },
  caseAddBtnTxt: { color: C.green, fontWeight: '700', fontSize: 15 },
  pdfBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a0a2e', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.purple, gap: 8 },
  pdfBtnText:  { color: C.purple, fontWeight: '700', fontSize: 15 },
  aiBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.accentDim, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.accent, gap: 8 },
  aiBtnText:  { color: C.accent, fontWeight: '700', fontSize: 15 },
  aiBtnBadge: { color: C.orange, fontWeight: '700', fontSize: 12, backgroundColor: C.orangeDim, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  resultsBox: { backgroundColor: C.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  resultsTopBar:{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: IS_IPAD ? 14 : 12, borderBottomWidth: 1, borderBottomColor: C.border },
  resultsLbl: { color: C.accent, fontWeight: '700', fontSize: IS_IPAD ? 12 : 11, letterSpacing: 2 },
  resultsCnt: { color: C.textDim, fontSize: IS_IPAD ? 12 : 11 },
  lpHint:     { color: C.textDim, fontSize: IS_IPAD ? 11 : 10, textAlign: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border },
  secHeader:  { backgroundColor: '#0a1018', paddingHorizontal: 16, paddingVertical: IS_IPAD ? 10 : 8 },
  secHeaderTxt:{ color: C.textDim, fontSize: IS_IPAD ? 11 : 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  resultRowAlert: { backgroundColor: C.redDim, borderLeftWidth: 3, borderLeftColor: C.red },
  resultRowWarn:  { backgroundColor: C.amberDim, borderLeftWidth: 3, borderLeftColor: C.amber },
  resultRowOk:    { backgroundColor: C.greenDim, borderLeftWidth: 3, borderLeftColor: C.green },
  resultRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: IS_IPAD ? 15 : 13, borderBottomWidth: 1, borderBottomColor: C.border },
  resultLbl:  { color: C.textDim, fontSize: IS_IPAD ? 11 : 10, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  resultVal:  { color: C.text, fontSize: IS_IPAD ? 15 : 14 },
  linkTxt:    { color: C.accent },
  copyTxt:    { color: C.green },
  extIcon:    { color: C.accent, fontSize: IS_IPAD ? 20 : 18, marginLeft: 8 },
  copyIcon:   { color: C.green,  fontSize: IS_IPAD ? 18 : 16, marginLeft: 8 },
  warnRow:    { flexDirection: 'row', backgroundColor: '#140e00', padding: IS_IPAD ? 16 : 14, borderBottomWidth: 1, borderBottomColor: C.border },
  warnTxt:    { color: C.amber, fontSize: IS_IPAD ? 13 : 12, flex: 1, lineHeight: IS_IPAD ? 20 : 18 },
  noteCard:   { backgroundColor: C.card, borderRadius: 12, padding: IS_IPAD ? 16 : 14, marginBottom: 12, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: C.purple },
  noteTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  noteBadge:  { backgroundColor: C.purpleDim, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  noteBadgeText:{ color: C.purple, fontSize: IS_IPAD ? 11 : 10, fontWeight: '700' },
  noteTime:   { color: C.textDim, fontSize: IS_IPAD ? 12 : 11 },
  noteText:   { color: C.text, fontSize: IS_IPAD ? 15 : 14, lineHeight: IS_IPAD ? 22 : 20, marginBottom: 8 },
  deleteTxt:  { color: C.red, fontSize: IS_IPAD ? 13 : 12, textAlign: 'right' },
  empty:      { color: C.textDim, textAlign: 'center', marginTop: 48, fontSize: IS_IPAD ? 15 : 14, lineHeight: 22, paddingHorizontal: 24 },
  histRow:    { backgroundColor: C.card, borderRadius: 10, padding: IS_IPAD ? 16 : 14, marginBottom: 10, borderWidth: 1, borderColor: C.border, flexDirection: 'row', justifyContent: 'space-between' },
  histModule: { color: C.accent, fontSize: IS_IPAD ? 11 : 10, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  histQuery:  { color: C.text, fontSize: IS_IPAD ? 14 : 13 },
  histTime:   { color: C.textDim, fontSize: IS_IPAD ? 12 : 10 },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  modalCard:  { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: IS_IPAD ? 32 : 24, paddingBottom: IS_IPAD ? 52 : 48 },
  iPadModal:  { marginHorizontal: 100, borderRadius: 24, marginBottom: 60 },
  modalTitle: { color: C.text, fontWeight: '700', fontSize: IS_IPAD ? 22 : 18, marginBottom: 8 },
  modalCaseHint:{ color: C.red, fontSize: 11, marginBottom: 12 },
  noteInput:  { backgroundColor: C.card, color: C.text, borderRadius: 12, padding: 14, fontSize: IS_IPAD ? 16 : 14, minHeight: IS_IPAD ? 140 : 110, textAlignVertical: 'top', borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  modalBtn:   { flex: 0.5, borderRadius: 12, padding: IS_IPAD ? 16 : 14, alignItems: 'center' },
  tagChip:    { paddingHorizontal: 14, paddingVertical: IS_IPAD ? 9 : 7, borderRadius: 20, backgroundColor: C.card, marginRight: 8, borderWidth: 1, borderColor: C.border },
  tagActive:  { backgroundColor: C.accentDim, borderColor: C.accent },
  tagText:    { color: C.textDim, fontSize: IS_IPAD ? 13 : 12 },
  tagTextActive:{ color: C.accent, fontWeight: '700' },
});
