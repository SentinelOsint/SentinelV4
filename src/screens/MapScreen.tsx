/**
 * SENTINEL – Map View Screen
 *
 * Interactive field map for:
 * – Pinning investigation locations
 * – Current device location
 * – Adding geo-notes
 * – iPad 3-column optimized layout
 *
 * Uses react-native-maps (Google Maps on iOS via app.json config)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, TextInput,
  ScrollView, Modal,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { C, IS_IPAD, SPACE } from '../utils/theme';

interface MapPin {
  id: string;
  title: string;
  note: string;
  coordinate: { latitude: number; longitude: number };
  color: string;
  timestamp: string;
}

const PIN_COLORS = ['#3b9eff', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

interface Props {
  onBack: () => void;
  onSaveNote: (text: string) => void;
}

export default function MapScreen({ onBack, onSaveNote }: Props) {
  const mapRef = useRef<MapView>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingCoord, setPendingCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pinTitle, setPinTitle] = useState('');
  const [pinNote, setPinNote] = useState('');
  const [pinColor, setPinColor] = useState(PIN_COLORS[0]);
  const [region, setRegion] = useState({
    latitude:      40.7128,
    longitude:    -74.0060,
    latitudeDelta:  0.05,
    longitudeDelta: 0.05,
  });

  const handleMapPress = (e: any) => {
    const coord = e.nativeEvent.coordinate;
    setPendingCoord(coord);
    setPinTitle('');
    setPinNote('');
    setPinColor(PIN_COLORS[0]);
    setShowAddModal(true);
  };

  const addPin = () => {
    if (!pendingCoord) return;
    const pin: MapPin = {
      id: Date.now().toString(),
      title: pinTitle.trim() || `Pin ${pins.length + 1}`,
      note: pinNote.trim(),
      coordinate: pendingCoord,
      color: pinColor,
      timestamp: new Date().toLocaleString('en-US'),
    };
    setPins(prev => [...prev, pin]);
    setShowAddModal(false);
  };

  const deletePin = (id: string) => {
    Alert.alert('Delete Pin', 'Remove this location pin?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setPins(prev => prev.filter(p => p.id !== id));
        setSelectedPin(null);
      }},
    ]);
  };

  const saveToNotes = (pin: MapPin) => {
    const text = `📍 ${pin.title}\nCoords: ${pin.coordinate.latitude.toFixed(5)}, ${pin.coordinate.longitude.toFixed(5)}\n${pin.note ? `Note: ${pin.note}` : ''}`.trim();
    onSaveNote(text);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.topBar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>🗺️ Map View</Text>
        <Text style={s.pinCount}>{pins.length} pins</Text>
      </View>

      <View style={s.mapContainer}>
        <MapView
          ref={mapRef}
          style={s.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
          showsUserLocation
          showsCompass
          showsScale
          mapType="hybrid"
        >
          {pins.map(pin => (
            <Marker
              key={pin.id}
              coordinate={pin.coordinate}
              pinColor={pin.color}
              onPress={() => setSelectedPin(pin)}
            >
              <Callout>
                <View style={s.callout}>
                  <Text style={s.calloutTitle}>{pin.title}</Text>
                  {pin.note ? <Text style={s.calloutNote}>{pin.note}</Text> : null}
                  <Text style={s.calloutTime}>{pin.timestamp}</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        {/* Map hint */}
        <View style={s.hintBanner}>
          <Text style={s.hintText}>Tap map to drop a pin</Text>
        </View>
      </View>

      {/* Pin list panel (iPad: sidebar style) */}
      {pins.length > 0 && (
        <View style={[s.pinList, IS_IPAD && s.iPadPinList]}>
          <Text style={s.pinListTitle}>PINNED LOCATIONS</Text>
          <ScrollView horizontal={!IS_IPAD} showsHorizontalScrollIndicator={false}>
            {pins.map(pin => (
              <TouchableOpacity
                key={pin.id}
                style={[s.pinChip, { borderLeftColor: pin.color }]}
                onPress={() => {
                  setSelectedPin(pin);
                  mapRef.current?.animateToRegion({
                    ...pin.coordinate,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }, 400);
                }}
              >
                <View style={[s.pinDot, { backgroundColor: pin.color }]} />
                <Text style={s.pinChipTitle} numberOfLines={1}>{pin.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Selected pin detail */}
      {selectedPin && (
        <View style={s.detailPanel}>
          <View style={s.detailHeader}>
            <View style={[s.colorDot, { backgroundColor: selectedPin.color }]} />
            <Text style={s.detailTitle}>{selectedPin.title}</Text>
            <TouchableOpacity onPress={() => setSelectedPin(null)}>
              <Text style={{ color: C.textDim, fontSize: 22, lineHeight: 22 }}>×</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.detailCoords}>{selectedPin.coordinate.latitude.toFixed(5)}, {selectedPin.coordinate.longitude.toFixed(5)}</Text>
          {selectedPin.note ? <Text style={s.detailNote}>{selectedPin.note}</Text> : null}
          <Text style={s.detailTime}>{selectedPin.timestamp}</Text>
          <View style={s.detailActions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => saveToNotes(selectedPin)}>
              <Text style={s.actionBtnTxt}>📋 Save to Notes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.deleteBtn]} onPress={() => deletePin(selectedPin.id)}>
              <Text style={[s.actionBtnTxt, { color: C.red }]}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add pin modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, IS_IPAD && s.iPadModal]}>
            <Text style={s.modalTitle}>Drop Pin</Text>
            {pendingCoord && (
              <Text style={s.modalCoords}>{pendingCoord.latitude.toFixed(5)}, {pendingCoord.longitude.toFixed(5)}</Text>
            )}
            <TextInput
              style={s.modalInput}
              placeholder="Pin title (optional)"
              placeholderTextColor={C.textDim}
              value={pinTitle}
              onChangeText={setPinTitle}
            />
            <TextInput
              style={[s.modalInput, { minHeight: 70, textAlignVertical: 'top' }]}
              placeholder="Note (optional)"
              placeholderTextColor={C.textDim}
              value={pinNote}
              onChangeText={setPinNote}
              multiline
            />
            <View style={s.colorRow}>
              {PIN_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setPinColor(c)}
                  style={[s.colorSwatch, { backgroundColor: c }, pinColor === c && s.colorSwatchActive]}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.card, flex: 0.5 }]} onPress={() => setShowAddModal(false)}>
                <Text style={{ color: C.textMid }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.accent, flex: 1 }]} onPress={addPin}>
                <Text style={{ color: C.bg, fontWeight: '800' }}>Drop Pin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.bg },
  topBar:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: IS_IPAD ? 16 : 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:      { marginRight: 10 },
  backText:     { color: C.accent, fontSize: 28, lineHeight: 28 },
  title:        { flex: 1, color: C.text, fontWeight: '700', fontSize: IS_IPAD ? 20 : 16 },
  pinCount:     { color: C.textDim, fontSize: 13 },
  mapContainer: { flex: 1, position: 'relative' },
  map:          { flex: 1 },
  hintBanner:   { position: 'absolute', top: 12, alignSelf: 'center', backgroundColor: 'rgba(7,11,18,0.82)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  hintText:     { color: C.textDim, fontSize: 12 },
  pinList:      { backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, padding: 12 },
  iPadPinList:  { maxHeight: 100 },
  pinListTitle: { color: C.textDim, fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  pinChip:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderLeftWidth: 3 },
  pinDot:       { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  pinChipTitle: { color: C.text, fontSize: 12, maxWidth: 100 },
  detailPanel:  { backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, padding: 16 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  colorDot:     { width: 12, height: 12, borderRadius: 6 },
  detailTitle:  { flex: 1, color: C.text, fontWeight: '700', fontSize: 16 },
  detailCoords: { color: C.accent, fontSize: 12, marginBottom: 4 },
  detailNote:   { color: C.textMid, fontSize: 13, marginBottom: 4 },
  detailTime:   { color: C.textDim, fontSize: 11, marginBottom: 12 },
  detailActions:{ flexDirection: 'row', gap: 10 },
  actionBtn:    { flex: 1, backgroundColor: C.card, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  deleteBtn:    { borderColor: C.red },
  actionBtnTxt: { color: C.text, fontSize: 13, fontWeight: '600' },
  callout:      { padding: 8, maxWidth: 200 },
  calloutTitle: { fontWeight: '700', fontSize: 13, color: '#111' },
  calloutNote:  { fontSize: 12, color: '#444', marginTop: 2 },
  calloutTime:  { fontSize: 10, color: '#888', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: IS_IPAD ? 32 : 24, paddingBottom: IS_IPAD ? 52 : 48 },
  iPadModal:    { marginHorizontal: 100, borderRadius: 24, marginBottom: 60 },
  modalTitle:   { color: C.text, fontWeight: '700', fontSize: IS_IPAD ? 20 : 18, marginBottom: 6 },
  modalCoords:  { color: C.accent, fontSize: 12, marginBottom: 14 },
  modalInput:   { backgroundColor: C.card, color: C.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  colorRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorSwatch:  { width: 30, height: 30, borderRadius: 15 },
  colorSwatchActive: { borderWidth: 3, borderColor: C.text },
  modalBtn:     { borderRadius: 12, padding: IS_IPAD ? 16 : 14, alignItems: 'center' },
});
