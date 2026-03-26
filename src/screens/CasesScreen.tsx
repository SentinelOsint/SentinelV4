import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar, Alert, Modal,
} from 'react-native';
import { CaseReport, FieldNote } from '../types';
import { Storage } from '../utils/storage';
import { C, STATUS_COLORS, PRIORITY_COLORS, CASE_TAGS, NOTE_TAGS, IS_IPAD, SPACE, FONT } from '../utils/theme';
import { exportCasePDF } from '../utils/pdfExport';
import { generateCaseReport, summarizeNotes } from '../utils/aiEngine';

interface Props {
  onBack: () => void;
  activeCaseId: string | null;
  onSetActiveCase: (id: string | null) => void;
}

type CaseView = 'list' | 'detail' | 'create';

export default function CasesScreen({ onBack, activeCaseId, onSetActiveCase }: Props) {
  const [cases, setCases] = useState<CaseReport[]>([]);
  const [view, setView] = useState<CaseView>('list');
  const [selectedCase, setSelectedCase] = useState<CaseReport | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteTag, setNoteTag] = useState('General');
  const [exporting, setExporting] = useState(false);
  const [aiScreen, setAiScreen] = useState<{ mode: 'report'|'summarize'; title: string; fetch: () => Promise<string> } | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTags, setNewTags] = useState<string[]>([]);

  useEffect(() => { loadCases(); }, []);

  const loadCases = async () => { setCases(await Storage.getCases()); };

  const createCase = async () => {
    if (!newTitle.trim()) { Alert.alert('Required', 'Case title is required.'); return; }
    const now = new Date().toLocaleString('en-US');
    const c: CaseReport = {
      id: `CASE-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim(),
      subject: newSubject.trim(),
      location: newLocation.trim(),
      status: 'active',
      priority: newPriority,
      createdAt: now,
      updatedAt: now,
      notes: [],
      searches: [],
      tags: newTags,
    };
    const updated = [c, ...cases];
    setCases(updated);
    await Storage.saveCases(updated);
    setNewTitle(''); setNewDesc(''); setNewSubject(''); setNewLocation('');
    setNewPriority('medium'); setNewTags([]);
    setView('list');
    Alert.alert('✓ Case Created', `ID: ${c.id}`);
  };

  const addNoteToCase = async () => {
    if (!noteText.trim() || !selectedCase) return;
    const note: FieldNote = {
      id: Date.now().toString(),
      text: noteText.trim(),
      tag: noteTag,
      timestamp: new Date().toLocaleString('en-US'),
    };
    const updated = cases.map(c =>
      c.id === selectedCase.id
        ? { ...c, notes: [note, ...c.notes], updatedAt: new Date().toLocaleString('en-US') }
        : c
    );
    setCases(updated);
    setSelectedCase(updated.find(c => c.id === selectedCase.id) || null);
    await Storage.saveCases(updated);
    setNoteText(''); setShowNoteModal(false);
    Alert.alert('✓ Note Added');
  };

  const updateStatus = async (id: string, status: CaseReport['status']) => {
    const updated = cases.map(c => c.id === id ? { ...c, status, updatedAt: new Date().toLocaleString('en-US') } : c);
    setCases(updated);
    if (selectedCase?.id === id) setSelectedCase(prev => prev ? { ...prev, status } : null);
    await Storage.saveCases(updated);
  };

  const deleteCase = (id: string) => {
    Alert.alert('Delete Case', 'All data for this case will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const updated = cases.filter(c => c.id !== id);
        setCases(updated);
        await Storage.saveCases(updated);
        if (activeCaseId === id) onSetActiveCase(null);
        setView('list');
      }},
    ]);
  };

  const exportPDF = async () => {
    if (!selectedCase) return;
    setExporting(true);
    try { await exportCasePDF(selectedCase); }
    catch { Alert.alert('Export Failed', 'Could not generate PDF. Ensure expo-print is installed.'); }
    setExporting(false);
  };

  const toggleTag = (tag: string) => setNewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  // shared topBar
  const TopBar = ({ title, rightEl }: { title: string; rightEl?: React.ReactNode }) => (
    <View style={s.topBar}>
      <TouchableOpacity onPress={() => view === 'list' ? onBack() : setView('list')} style={s.backBtn}>
        <Text style={s.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={s.screenTitle} numberOfLines={1}>{title}</Text>
      {rightEl}
    </View>
  );

  // ── LIST ────────────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <TopBar title="⚖️ Case Management" rightEl={
        <TouchableOpacity onPress={() => setView('create')} style={s.headerBtn}>
          <Text style={s.headerBtnText}>+ New</Text>
        </TouchableOpacity>
      } />
      {activeCaseId && (
        <View style={s.activeBanner}>
          <Text style={s.activeBannerText}>🔴 Active: {cases.find(c => c.id === activeCaseId)?.title}</Text>
          <TouchableOpacity onPress={() => onSetActiveCase(null)}>
            <Text style={s.activeBannerOff}>Deactivate</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView contentContainerStyle={[s.listContent, IS_IPAD && s.iPadList]}>
        {cases.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📁</Text>
            <Text style={s.emptyTitle}>No Cases Yet</Text>
            <Text style={s.emptyBody}>Create a case to organize searches and field notes.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setView('create')}>
              <Text style={s.emptyBtnText}>+ Create First Case</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* On iPad, show 2-column grid of case cards */}
        {IS_IPAD ? (
          <View style={s.iPadGrid}>
            {cases.map(c => <CaseCard key={c.id} c={c} onPress={() => { setSelectedCase(c); setView('detail'); }} activeCaseId={activeCaseId} />)}
          </View>
        ) : (
          cases.map(c => <CaseCard key={c.id} c={c} onPress={() => { setSelectedCase(c); setView('detail'); }} activeCaseId={activeCaseId} />)
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );

  // ── CREATE ──────────────────────────────────────────────────────────────────
  if (view === 'create') return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <TopBar title="New Case" />
      <ScrollView contentContainerStyle={[s.formContent, IS_IPAD && s.iPadForm]} keyboardShouldPersistTaps="handled">
        <Field label="Case Title *">
          <TextInput style={s.input} value={newTitle} onChangeText={setNewTitle} placeholder="e.g. Insurance Fraud – Smith" placeholderTextColor={C.textDim} />
        </Field>
        <View style={IS_IPAD ? s.twoCol : {}}>
          <Field label="Subject Name" flex={IS_IPAD}>
            <TextInput style={s.input} value={newSubject} onChangeText={setNewSubject} placeholder="Person or entity" placeholderTextColor={C.textDim} />
          </Field>
          <Field label="Location" flex={IS_IPAD}>
            <TextInput style={s.input} value={newLocation} onChangeText={setNewLocation} placeholder="City, State" placeholderTextColor={C.textDim} autoCapitalize="words" />
          </Field>
        </View>
        <Field label="Description / Objective">
          <TextInput style={[s.input, s.textArea]} value={newDesc} onChangeText={setNewDesc} placeholder="Investigation objective…" placeholderTextColor={C.textDim} multiline autoCorrect={false} autoCapitalize="none" spellCheck={false} />
        </Field>
        <Field label="Priority">
          <View style={s.chipRow}>
            {(['low', 'medium', 'high'] as const).map(p => (
              <TouchableOpacity key={p} onPress={() => setNewPriority(p)}
                style={[s.priorityChip, { borderColor: PRIORITY_COLORS[p] }, newPriority === p && { backgroundColor: PRIORITY_COLORS[p] + '33' }]}>
                <Text style={[s.priorityChipText, { color: PRIORITY_COLORS[p] }]}>{p.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>
        <Field label="Case Type Tags">
          <View style={s.tagsWrap}>
            {CASE_TAGS.map(t => (
              <TouchableOpacity key={t} onPress={() => toggleTag(t)} style={[s.tagChip, newTags.includes(t) && s.tagChipActive]}>
                <Text style={[s.tagChipText, newTags.includes(t) && s.tagChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>
        <TouchableOpacity style={s.createBtn} onPress={createCase}>
          <Text style={s.createBtnText}>Create Case</Text>
        </TouchableOpacity>
        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );

  // ── AI SCREEN ───────────────────────────────────────────────────────────────
  if (aiScreen) {
    const AIResultScreen = require('./AIResultScreen').default;
    return (
      <AIResultScreen
        mode={aiScreen.mode}
        title={aiScreen.title}
        onBack={() => setAiScreen(null)}
        onSaveNote={(text: string) => {
          setNoteText(text);
          setAiScreen(null);
          setShowNoteModal(true);
        }}
        fetchResult={aiScreen.fetch}
      />
    );
  }

  // ── DETAIL ──────────────────────────────────────────────────────────────────
  if (!selectedCase) return null;
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <TopBar title={selectedCase.title} rightEl={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.headerBtn} onPress={exportPDF} disabled={exporting}>
            <Text style={[s.headerBtnText, { color: C.purple }]}>{exporting ? '…' : '↓ PDF'}</Text>
          </TouchableOpacity>
        </View>
      } />
      <ScrollView contentContainerStyle={[s.formContent, IS_IPAD && s.iPadForm]}>
        {/* Header */}
        <View style={s.detailMeta}>
          <Text style={s.caseId}>{selectedCase.id}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[s.badge, { backgroundColor: STATUS_COLORS[selectedCase.status] + '22', borderColor: STATUS_COLORS[selectedCase.status] }]}>
              <Text style={[s.badgeText, { color: STATUS_COLORS[selectedCase.status] }]}>{selectedCase.status.toUpperCase()}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: PRIORITY_COLORS[selectedCase.priority] + '22', borderColor: PRIORITY_COLORS[selectedCase.priority] }]}>
              <Text style={[s.badgeText, { color: PRIORITY_COLORS[selectedCase.priority] }]}>{selectedCase.priority.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={IS_IPAD ? s.twoCol : {}}>
          {selectedCase.subject ? <InfoCell label="Subject" value={selectedCase.subject} flex={IS_IPAD} /> : null}
          {selectedCase.location ? <InfoCell label="Location" value={selectedCase.location} flex={IS_IPAD} /> : null}
          <InfoCell label="Created" value={selectedCase.createdAt} flex={IS_IPAD} />
          <InfoCell label="Updated" value={selectedCase.updatedAt} flex={IS_IPAD} />
        </View>

        {selectedCase.description ? (
          <View style={s.descBox}>
            <Text style={s.infoLabel}>Description</Text>
            <Text style={s.descText}>{selectedCase.description}</Text>
          </View>
        ) : null}

        {selectedCase.tags.length > 0 && (
          <View style={s.tagsWrap}>
            {selectedCase.tags.map(t => <View key={t} style={s.tagPill}><Text style={s.tagPillText}>{t}</Text></View>)}
          </View>
        )}

        {/* Actions */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.actionBtn, activeCaseId === selectedCase.id ? { backgroundColor: C.greenDim, borderColor: C.green } : { backgroundColor: C.accentDim, borderColor: C.accent }]}
            onPress={() => onSetActiveCase(activeCaseId === selectedCase.id ? null : selectedCase.id)}
          >
            <Text style={[s.actionBtnText, { color: activeCaseId === selectedCase.id ? C.green : C.accent }]}>
              {activeCaseId === selectedCase.id ? '✓ Active Case' : '▶ Set Active'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.purpleDim, borderColor: C.purple }]} onPress={exportPDF} disabled={exporting}>
            <Text style={[s.actionBtnText, { color: C.purple }]}>{exporting ? '…' : '↓ Export PDF'}</Text>
          </TouchableOpacity>
        </View>

        {/* AI Actions */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#1a0a2e', borderColor: '#a855f7' }]}
            onPress={() => setAiScreen({
              mode: 'report',
              title: selectedCase.title,
              fetch: () => generateCaseReport(selectedCase),
            })}
          >
            <Text style={[s.actionBtnText, { color: '#a855f7' }]}>🤖 AI Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#001a0a', borderColor: '#00ff88' }]}
            onPress={() => {
              if (selectedCase.notes.length === 0) {
                Alert.alert('No Notes', 'Add field notes to this case first.');
                return;
              }
              setAiScreen({
                mode: 'summarize',
                title: `${selectedCase.title} – Notes`,
                fetch: () => summarizeNotes(selectedCase.notes),
              });
            }}
          >
            <Text style={[s.actionBtnText, { color: '#00ff88' }]}>📋 AI Summary</Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <Text style={s.sectionTitle}>Status</Text>
        <View style={s.chipRow}>
          {(['active', 'pending', 'closed'] as const).map(st => (
            <TouchableOpacity key={st} onPress={() => updateStatus(selectedCase.id, st)}
              style={[s.statusChip, { borderColor: STATUS_COLORS[st] }, selectedCase.status === st && { backgroundColor: STATUS_COLORS[st] + '33' }]}>
              <Text style={[s.statusChipText, { color: STATUS_COLORS[st] }]}>{st.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Field Notes ({selectedCase.notes.length})</Text>
          <TouchableOpacity onPress={() => setShowNoteModal(true)}>
            <Text style={s.sectionAdd}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {selectedCase.notes.length === 0 && <Text style={s.emptyBody}>No notes yet. Tap + Add.</Text>}
        {selectedCase.notes.map(n => (
          <View key={n.id} style={s.noteCard}>
            <View style={s.noteCardTop}>
              <View style={s.noteBadge}><Text style={s.noteBadgeText}>{n.tag}</Text></View>
              <Text style={s.noteTime}>{n.timestamp}</Text>
            </View>
            <Text style={s.noteText}>{n.text}</Text>
          </View>
        ))}

        {/* Search log */}
        <Text style={[s.sectionTitle, { marginTop: 16 }]}>Search Log ({selectedCase.searches.length})</Text>
        {selectedCase.searches.length === 0 && <Text style={s.emptyBody}>No searches logged. Set this case as active to link searches.</Text>}
        {selectedCase.searches.map(sr => (
          <View key={sr.id} style={s.searchRow}>
            <Text style={s.searchModule}>{sr.module}</Text>
            <Text style={s.searchQuery}>{sr.query}</Text>
            <Text style={s.searchTime}>{sr.timestamp}</Text>
          </View>
        ))}

        <TouchableOpacity style={s.deleteBtn} onPress={() => deleteCase(selectedCase.id)}>
          <Text style={s.deleteBtnText}>🗑  Delete This Case</Text>
        </TouchableOpacity>
        <View style={{ height: 48 }} />
      </ScrollView>

      <Modal visible={showNoteModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, IS_IPAD && s.iPadModal]}>
            <Text style={s.modalTitle}>Add Field Note</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {NOTE_TAGS.map(t => (
                <TouchableOpacity key={t} onPress={() => setNoteTag(t)} style={[s.tagChip, noteTag === t && s.tagChipActive]}>
                  <Text style={[s.tagChipText, noteTag === t && s.tagChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={[s.input, s.noteInput]} value={noteText} onChangeText={setNoteText}
              placeholder="Record your observation…" placeholderTextColor={C.textDim} multiline numberOfLines={5} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.card }]} onPress={() => setShowNoteModal(false)}>
                <Text style={{ color: C.textMid }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.accent, flex: 1 }]} onPress={addNoteToCase}>
                <Text style={{ color: C.bg, fontWeight: '700' }}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper components
const Field = ({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) => (
  <View style={flex ? { flex: 1 } : {}}>
    <Text style={{ color: C.textMid, fontSize: IS_IPAD ? 12 : 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 4 }}>{label}</Text>
    {children}
  </View>
);

const InfoCell = ({ label, value, flex }: { label: string; value: string; flex?: boolean }) => (
  <View style={[{ backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: C.accent }, flex && { flex: 1 }]}>
    <Text style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{label}</Text>
    <Text style={{ color: C.text, fontSize: IS_IPAD ? 14 : 13, fontWeight: '600' }}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: IS_IPAD ? 14 : 12, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { marginRight: 10 },
  backText: { color: C.accent, fontSize: 28, lineHeight: 28 },
  screenTitle: { flex: 1, color: C.text, fontWeight: '700', fontSize: IS_IPAD ? 20 : 17 },
  headerBtn: { padding: 6 },
  headerBtnText: { color: C.accent, fontSize: IS_IPAD ? 15 : 13, fontWeight: '600' },
  activeBanner: { backgroundColor: C.redDim, borderBottomWidth: 1, borderBottomColor: C.red, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeBannerText: { color: C.red, fontSize: IS_IPAD ? 13 : 12, flex: 1 },
  activeBannerOff: { color: C.red, fontSize: 12, fontWeight: '700', marginLeft: 12 },
  listContent: { padding: 16 },
  iPadList: { paddingHorizontal: 24 },
  iPadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  formContent: { padding: 16 },
  iPadForm: { paddingHorizontal: IS_IPAD ? 48 : 16, maxWidth: 760, alignSelf: 'center', width: '100%' },
  twoCol: { flexDirection: 'row', gap: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: IS_IPAD ? 64 : 48, marginBottom: 16 },
  emptyTitle: { color: C.text, fontSize: IS_IPAD ? 24 : 20, fontWeight: '700', marginBottom: 8 },
  emptyBody: { color: C.textDim, fontSize: IS_IPAD ? 15 : 13, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 24 },
  emptyBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  emptyBtnText: { color: C.bg, fontWeight: '800', fontSize: IS_IPAD ? 16 : 14 },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: IS_IPAD ? 14 : 12, fontSize: IS_IPAD ? 16 : 14, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  textArea: { height: IS_IPAD ? 120 : 90, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  priorityChip: { flex: 1, padding: IS_IPAD ? 12 : 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, backgroundColor: C.card },
  priorityChipText: { fontSize: IS_IPAD ? 13 : 12, fontWeight: '700' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tagChip: { paddingHorizontal: 12, paddingVertical: IS_IPAD ? 8 : 6, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tagChipActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  tagChipText: { color: C.textDim, fontSize: IS_IPAD ? 13 : 12 },
  tagChipTextActive: { color: C.accent, fontWeight: '700' },
  tagPill: { backgroundColor: C.accentDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagPillText: { color: C.accent, fontSize: 11, fontWeight: '600' },
  createBtn: { backgroundColor: C.accent, borderRadius: 14, padding: IS_IPAD ? 18 : 16, alignItems: 'center', marginTop: 8 },
  createBtnText: { color: C.bg, fontWeight: '800', fontSize: IS_IPAD ? 18 : 16 },
  detailMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  caseId: { color: C.textDim, fontSize: 11, letterSpacing: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  descBox: { backgroundColor: C.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: C.accent },
  infoLabel: { color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  descText: { color: C.textMid, fontSize: IS_IPAD ? 14 : 13, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: { flex: 1, borderRadius: 12, padding: IS_IPAD ? 14 : 12, alignItems: 'center', borderWidth: 1 },
  actionBtnText: { fontWeight: '700', fontSize: IS_IPAD ? 14 : 13 },
  sectionTitle: { color: C.accent, fontSize: IS_IPAD ? 12 : 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionAdd: { color: C.accent, fontSize: IS_IPAD ? 15 : 13, fontWeight: '600' },
  statusChip: { flex: 1, padding: IS_IPAD ? 12 : 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, backgroundColor: C.card },
  statusChipText: { fontSize: IS_IPAD ? 12 : 11, fontWeight: '700' },
  noteCard: { backgroundColor: C.card, borderRadius: 10, padding: IS_IPAD ? 14 : 12, marginBottom: 8, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: C.purple },
  noteCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  noteBadge: { backgroundColor: C.purpleDim, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  noteBadgeText: { color: C.purple, fontSize: IS_IPAD ? 11 : 10, fontWeight: '700' },
  noteTime: { color: C.textDim, fontSize: IS_IPAD ? 12 : 10 },
  noteText: { color: C.text, fontSize: IS_IPAD ? 14 : 13, lineHeight: IS_IPAD ? 22 : 19 },
  searchRow: { backgroundColor: C.card, borderRadius: 10, padding: IS_IPAD ? 14 : 12, marginBottom: 6, borderWidth: 1, borderColor: C.border },
  searchModule: { color: C.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  searchQuery: { color: C.text, fontSize: IS_IPAD ? 14 : 13, marginBottom: 2 },
  searchTime: { color: C.textDim, fontSize: 10 },
  deleteBtn: { marginTop: 24, backgroundColor: C.redDim, borderRadius: 12, padding: IS_IPAD ? 16 : 14, alignItems: 'center', borderWidth: 1, borderColor: C.red },
  deleteBtnText: { color: C.red, fontWeight: '700', fontSize: IS_IPAD ? 15 : 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  iPadModal: { marginHorizontal: 80, borderRadius: 24, marginBottom: 40 },
  modalTitle: { color: C.text, fontWeight: '700', fontSize: IS_IPAD ? 20 : 18, marginBottom: 16 },
  noteInput: { minHeight: IS_IPAD ? 130 : 100, textAlignVertical: 'top', marginBottom: 16 },
  modalBtn: { flex: 0.5, borderRadius: 12, padding: IS_IPAD ? 16 : 14, alignItems: 'center' },
  // Case card (list view)
  caseCard: { width: IS_IPAD ? '48%' : '100%', backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: IS_IPAD ? 0 : 12, borderWidth: 1, borderColor: C.border },
});

// Standalone case card to support both grid and list
const CaseCard = ({ c, onPress, activeCaseId }: { c: CaseReport; onPress: () => void; activeCaseId: string | null }) => (
  <TouchableOpacity style={[s.caseCard, { position: 'relative', overflow: 'hidden' }]} onPress={onPress} activeOpacity={0.75}>
    {c.id === activeCaseId && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.green }} />}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.textDim, fontSize: 10, letterSpacing: 1, marginBottom: 2 }}>{c.id}</Text>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: IS_IPAD ? 16 : 15 }} numberOfLines={1}>{c.title}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[s.badge, { backgroundColor: STATUS_COLORS[c.status] + '22', borderColor: STATUS_COLORS[c.status] }]}>
          <Text style={[s.badgeText, { color: STATUS_COLORS[c.status] }]}>{c.status.toUpperCase()}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: PRIORITY_COLORS[c.priority] + '22', borderColor: PRIORITY_COLORS[c.priority] }]}>
          <Text style={[s.badgeText, { color: PRIORITY_COLORS[c.priority] }]}>{c.priority.toUpperCase()}</Text>
        </View>
      </View>
    </View>
    {c.subject ? <Text style={{ color: C.textMid, fontSize: IS_IPAD ? 13 : 12, marginBottom: 8 }}>Subject: {c.subject}</Text> : null}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: C.accent, fontSize: 11 }}>{c.notes.length} notes · {c.searches.length} searches</Text>
      <Text style={{ color: C.textDim, fontSize: 11 }}>{c.updatedAt}</Text>
    </View>
  </TouchableOpacity>
);
