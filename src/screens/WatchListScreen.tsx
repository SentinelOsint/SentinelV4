/**
 * SENTINEL – Watch List Screen
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { C, IS_IPAD } from '../utils/theme';
import {
  WatchItem, WatchType,
  getWatchList, addWatchItem, removeWatchItem,
  toggleWatchItem, checkAllWatchItems, requestNotificationPermission,
  registerBackgroundCheck,
} from '../utils/watchList';

interface Props {
  isPro: boolean;
  onBack: () => void;
}

const TYPE_ICONS: Record<WatchType, string> = {
  person: '👤', domain: '🔗', ip: '🌐', email: '✉️', phone: '📞',
};

export default function WatchListScreen({ isPro, onBack }: Props) {
  const [items, setItems]       = useState<WatchItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [checking, setChecking] = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [label, setLabel]       = useState('');
  const [value, setValue]       = useState('');
  const [type, setType]         = useState<WatchType>('domain');

  const load = useCallback(async () => {
    try {
      const list = await getWatchList();
      setItems(list);
    } catch (e) {
      console.log('WatchList load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);
 

  useEffect(() => {
    load();
    requestNotificationPermission();
    registerBackgroundCheck();
  }, [load]);

  const handleAdd = async () => {
    if (!label.trim() || !value.trim()) {
      Alert.alert('Missing Info', 'Please enter both a label and a value.');
      return;
    }
    await addWatchItem({ label: label.trim(), value: value.trim(), type });
    setLabel(''); setValue(''); setShowAdd(false);
    await load();
  };

  const handleRemove = (item: WatchItem) => {
    Alert.alert('Remove', `Remove "${item.label}" from Watch List?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await removeWatchItem(item.id); await load(); } },
    ]);
  };

  const handleToggle = async (item: WatchItem) => {
    await toggleWatchItem(item.id);
    await load();
  };

  const handleCheckAll = async () => {
    setChecking(true);
    await checkAllWatchItems();
    await load();
    setChecking(false);
    Alert.alert('Check Complete', 'All active watch items have been checked.');
  };

  const formatDate = (iso?: string) => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Watch List</Text>
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={s.addBtn}>
          <Text style={s.addBtnTxt}>{showAdd ? '✕' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {showAdd && (
          <View style={s.addCard}>
            <Text style={s.addTitle}>Add Watch Target</Text>
            <View style={s.typeRow}>
              {(['person','domain','ip','email','phone'] as WatchType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeBtn, type === t && s.typeBtnActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[s.typeBtnTxt, type === t && s.typeBtnTxtActive]}>
                    {TYPE_ICONS[t]} {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={s.input}
              placeholder="Label (e.g. John Doe)"
              placeholderTextColor={C.textDim}
              value={label}
              onChangeText={setLabel}
            />
            <TextInput
              style={s.input}
              placeholder={
                type === 'domain' ? 'example.com' :
                type === 'ip'     ? '1.2.3.4' :
                type === 'email'  ? 'user@example.com' :
                type === 'phone'  ? '+1 555 000 0000' : 'Full name'
              }
              placeholderTextColor={C.textDim}
              value={value}
              onChangeText={setValue}
              autoCapitalize="none"
            />
            <TouchableOpacity style={s.saveBtn} onPress={handleAdd}>
              <Text style={s.saveBtnTxt}>Add to Watch List</Text>
            </TouchableOpacity>
          </View>
        )}

        {items.length > 0 && (
          <TouchableOpacity style={s.checkBtn} onPress={handleCheckAll} disabled={checking}>
            {checking
              ? <ActivityIndicator color={C.accent} size="small" />
              : <Text style={s.checkBtnTxt}>🔄 Check All Now</Text>
            }
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={s.empty}>
          <Text style={s.emptyIcon}>[ ]</Text>
            <Text style={s.emptyTitle}>No watch targets</Text>
            <Text style={s.emptyDesc}>Add domains, IPs, emails, or persons to monitor for changes.</Text>
          </View>
        ) : (
          items.map(item => (
            <View key={item.id} style={[s.itemCard, !item.active && s.itemCardInactive]}>
              <View style={s.itemTop}>
                <View style={s.itemLeft}>
                  <Text style={s.itemIcon}>{TYPE_ICONS[item.type]}</Text>
                  <View>
                    <Text style={s.itemLabel}>{item.label}</Text>
                    <Text style={s.itemValue}>{item.value}</Text>
                  </View>
                </View>
                <View style={s.itemActions}>
                  <TouchableOpacity onPress={() => handleToggle(item)} style={s.toggleBtn}>
                    <Text style={[s.toggleTxt, item.active ? s.toggleActive : s.toggleInactive]}>
                      {item.active ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemove(item)} style={s.removeBtn}>
                    <Text style={s.removeTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.itemMeta}>
                <Text style={s.metaTxt}>Last checked: {formatDate(item.lastChecked)}</Text>
                {item.alertCount > 0 && (
                  <View style={s.alertBadge}>
                    <Text style={s.alertBadgeTxt}>🔔 {item.alertCount} alerts</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        <Text style={s.note}>
          Note: Checks run automatically once per day in the background.{'\n'}
          Tap "Check All Now" for an immediate update.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: C.bg },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:          { marginRight: 12 },
  backTxt:          { color: C.accent, fontSize: 15 },
  title:            { color: C.text, fontSize: 17, fontWeight: '700', flex: 1 },
  addBtn:           { backgroundColor: C.accentDim, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnTxt:        { color: C.accent, fontSize: 13, fontWeight: '700' },
  content:          { padding: IS_IPAD ? 24 : 16, paddingBottom: 40 },
  addCard:          { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  addTitle:         { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  typeRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeBtn:          { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
  typeBtnActive:    { backgroundColor: C.accentDim, borderColor: C.accent },
  typeBtnTxt:       { color: C.textDim, fontSize: 12 },
  typeBtnTxtActive: { color: C.accent, fontWeight: '700' },
  input:            { backgroundColor: C.bg, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 12, color: C.text, fontSize: 14, marginBottom: 10 },
  saveBtn:          { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnTxt:       { color: C.bg, fontSize: 15, fontWeight: '700' },
  checkBtn:         { backgroundColor: C.card, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: C.border },
  checkBtnTxt:      { color: C.accent, fontSize: 14, fontWeight: '600' },
  empty:            { alignItems: 'center', marginTop: 60 },
  emptyIcon:        { fontSize: 48, marginBottom: 12 },
  emptyTitle:       { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyDesc:        { color: C.textDim, fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  itemCard:         { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  itemCardInactive: { opacity: 0.5 },
  itemTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLeft:         { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  itemIcon:         { fontSize: 24 },
  itemLabel:        { color: C.text, fontSize: 15, fontWeight: '700' },
  itemValue:        { color: C.textDim, fontSize: 12, marginTop: 2 },
  itemActions:      { flexDirection: 'row', gap: 8, alignItems: 'center' },
  toggleBtn:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  toggleTxt:        { fontSize: 11, fontWeight: '700' },
  toggleActive:     { color: C.green },
  toggleInactive:   { color: C.textDim },
  removeBtn:        { padding: 6 },
  removeTxt:        { color: C.textDim, fontSize: 14 },
  itemMeta:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  metaTxt:          { color: C.textDim, fontSize: 11 },
  alertBadge:       { backgroundColor: C.amberDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  alertBadgeTxt:    { color: C.amber, fontSize: 11, fontWeight: '600' },
  note:             { color: C.textDim, fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
