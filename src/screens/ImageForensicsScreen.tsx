/**
 * SENTINEL – Image Forensics (Pro)
 *
 * Metadata extraction, multi-quality Error Level Analysis, JPEG compression
 * analysis, hidden-data screening, and perceptual hashing — with an AI
 * Forensic Interpretation layer that structures the combined output into
 * SUPPORTED FINDINGS / POSSIBLE ANOMALIES / CONFLICTING INDICATORS /
 * LIMITATIONS / RECOMMENDED VERIFICATION. Identifies forensic indicators;
 * never declares authenticity or manipulation from a single signal.
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView, StatusBar,
  StyleSheet, Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { C, IS_IPAD, SPACE, FONT, CARD } from '../utils/theme';
import { AuditLog } from '../utils/auditLog';
import {
  extractImageMetadata,
  analyzeImageELA,
  analyzeImageCompression,
  screenImageHiddenData,
  computeImagePerceptualHash,
  generateImageForensicInterpretation,
} from '../utils/aiEngine';

interface Props {
  isPro: boolean;
  onBack: () => void;
  onUpgrade: () => void;
}

interface ForensicsResults {
  metadata?: any;
  ela?: any;
  compression?: any;
  hiddenData?: any;
  phash?: any;
  interpretation?: string;
}

// Parses the AI interpretation plain-text response into labeled sections.
function parseInterpretation(text: string): { label: string; color: string; lines: string[] }[] {
  const sectionDefs = [
    { key: 'SUPPORTED FINDINGS', color: C.greenMid },
    { key: 'POSSIBLE ANOMALIES', color: C.amberMid },
    { key: 'CONFLICTING INDICATORS', color: C.redMid },
    { key: 'LIMITATIONS', color: C.gray },
    { key: 'RECOMMENDED VERIFICATION', color: C.accent },
    { key: 'ASSESSMENT', color: C.purpleMid },
  ];
  const sections: { label: string; color: string; lines: string[] }[] = [];
  const lines = text.split('\n');
  let current: { label: string; color: string; lines: string[] } | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = sectionDefs.find((s) => line.toUpperCase() === s.key);
    if (match) {
      if (current) sections.push(current);
      current = { label: match.key, color: match.color, lines: [] };
      continue;
    }
    if (current && line) current.lines.push(line);
  }
  if (current) sections.push(current);
  return sections.length > 0 ? sections : [{ label: 'AI INTERPRETATION', color: C.purpleMid, lines: [text] }];
}

export default function ImageForensicsScreen({ isPro, onBack, onUpgrade }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [results, setResults] = useState<ForensicsResults | null>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Sentinel needs access to your photo library to analyze an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64 || null);
      setResults(null);
    }
  };

  const runAnalysis = async () => {
    if (!imageBase64) return;
    if (!isPro) { onUpgrade(); return; }
    setLoading(true);
    setResults(null);
    try {
      setLoadingStep('Extracting metadata...');
      const metadata = await extractImageMetadata(imageBase64);
      setLoadingStep('Running Error Level Analysis...');
      const ela = await analyzeImageELA(imageBase64);
      setLoadingStep('Analyzing compression...');
      const compression = await analyzeImageCompression(imageBase64);
      setLoadingStep('Screening for hidden data...');
      const hiddenData = await screenImageHiddenData(imageBase64);
      setLoadingStep('Computing perceptual hash...');
      const phash = await computeImagePerceptualHash(imageBase64);
      setLoadingStep('Generating AI forensic interpretation...');
      const interpretation = await generateImageForensicInterpretation(metadata, ela, compression, hiddenData, phash);
      setResults({ metadata, ela, compression, hiddenData, phash, interpretation });
      await AuditLog.log('SEARCH_QUERY', 'Image Forensics Analysis Completed');
    } catch (e: any) {
      Alert.alert('Analysis Error', e?.message || 'Something went wrong during image forensics analysis.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Image Forensics</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACE.lg, paddingBottom: SPACE.xxl }}>
        <Text style={styles.disclaimer}>
          Identifies forensic indicators (metadata, compression, hidden data, similarity). Does not determine
          authenticity from a single signal — results require professional interpretation.
        </Text>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <TouchableOpacity style={styles.pickerBox} onPress={pickImage}>
            <Text style={styles.pickerBoxText}>Tap to select a photo</Text>
          </TouchableOpacity>
        )}

        <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
            <Text style={styles.secondaryBtnText}>{imageUri ? 'Change Photo' : 'Select Photo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, (!imageBase64 || loading) && styles.btnDisabled]}
            onPress={runAnalysis}
            disabled={!imageBase64 || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Run Forensic Analysis</Text>}
          </TouchableOpacity>
        </View>

        {loading && <Text style={styles.loadingStep}>{loadingStep}</Text>}

        {results && (
          <View style={{ marginTop: SPACE.lg }}>
            {/* Metadata */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>METADATA EXTRACTION</Text>
              {results.metadata?.metadataPresent ? (
                <>
                  {results.metadata.camera?.make && <Text style={styles.cardLine}>Camera: {results.metadata.camera.make} {results.metadata.camera.model}</Text>}
                  {results.metadata.software && <Text style={styles.cardLine}>Software: {results.metadata.software}</Text>}
                  {results.metadata.timestamps?.dateTimeOriginal && <Text style={styles.cardLine}>Date Taken: {results.metadata.timestamps.dateTimeOriginal}</Text>}
                  {results.metadata.gps && <Text style={styles.cardLine}>GPS: {results.metadata.gps.latitude}, {results.metadata.gps.longitude}</Text>}
                  <Text style={styles.cardLine}>Thumbnail Present: {results.metadata.thumbnail?.present ? 'Yes' : 'No'}</Text>
                </>
              ) : (
                <Text style={styles.cardNote}>{results.metadata?.note}</Text>
              )}
            </View>

            {/* ELA */}
            {results.ela && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>ERROR LEVEL ANALYSIS</Text>
                {results.ela.perQuality?.map((q: any, i: number) => (
                  <Text key={i} style={styles.cardLine}>Quality {q.quality}: mean diff {q.meanDiff}, high-diff pixels {q.highDiffPercent}%</Text>
                ))}
                {results.ela.visualElaImageBase64 && (
                  <Image
                    source={{ uri: `data:image/png;base64,${results.ela.visualElaImageBase64}` }}
                    style={styles.elaImage}
                    resizeMode="contain"
                  />
                )}
                <Text style={styles.cardNote}>{results.ela.note}</Text>
              </View>
            )}

            {/* Compression */}
            {results.compression && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>JPEG / COMPRESSION ANALYSIS</Text>
                {results.compression.applicable ? (
                  <>
                    <Text style={styles.cardLine}>Estimated Original Quality: {results.compression.estimatedOriginalQuality}% ({results.compression.estimatedQualityConfidence} confidence)</Text>
                    <Text style={styles.cardLine}>Chroma Subsampling: {results.compression.chromaSubsampling || 'N/A'}</Text>
                    <Text style={styles.cardLine}>Progressive: {results.compression.isProgressive ? 'Yes' : 'No'}</Text>
                  </>
                ) : (
                  <Text style={styles.cardNote}>{results.compression.note}</Text>
                )}
              </View>
            )}

            {/* Hidden Data */}
            {results.hiddenData && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>HIDDEN-DATA SCREENING</Text>
                {results.hiddenData.parsed ? (
                  <>
                    <Text style={styles.cardLine}>Trailing Data: {results.hiddenData.trailingDataBytes} byte(s)</Text>
                    <Text style={styles.cardLine}>
                      {results.hiddenData.format === 'jpeg'
                        ? `Comment Segments: ${results.hiddenData.commentSegments}`
                        : `Text Chunks: ${results.hiddenData.textChunks}`}
                    </Text>
                  </>
                ) : null}
                <Text style={styles.cardNote}>{results.hiddenData.note}</Text>
              </View>
            )}

            {/* Perceptual Hash */}
            {results.phash?.hash && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>PERCEPTUAL HASH</Text>
                <Text style={[styles.cardLine, { fontFamily: 'Courier' }]}>{results.phash.hash}</Text>
                <Text style={styles.cardNote}>Use this hash to compare against another image for near-duplicate detection.</Text>
              </View>
            )}

            {/* AI Interpretation */}
            {results.interpretation && (
              <View style={[styles.card, { borderColor: C.purple, borderWidth: 1 }]}>
                <Text style={[styles.cardTitle, { color: C.purpleMid }]}>AI FORENSIC INTERPRETATION</Text>
                {parseInterpretation(results.interpretation).map((section, i) => (
                  <View key={i} style={{ marginBottom: SPACE.md }}>
                    <Text style={[styles.sectionLabel, { color: section.color }]}>{section.label}</Text>
                    {section.lines.map((line, j) => (
                      <Text key={j} style={styles.cardLine}>{line.replace(/^-\s*/, '• ')}</Text>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backText: { color: C.accent, fontSize: FONT.md },
  headerTitle: { color: C.text, fontSize: FONT.lg, fontWeight: '700' },
  disclaimer: { color: C.textDim, fontSize: FONT.xs, lineHeight: 15, marginBottom: SPACE.md },
  pickerBox: {
    height: 180, borderRadius: CARD.radius, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed',
    backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center',
  },
  pickerBoxText: { color: C.textMid, fontSize: FONT.sm },
  preview: { width: '100%', height: 220, borderRadius: CARD.radius, backgroundColor: C.surface },
  secondaryBtn: {
    flex: 1, backgroundColor: C.surface, borderRadius: CARD.radiusSm, borderWidth: 1, borderColor: C.border,
    paddingVertical: 12, alignItems: 'center',
  },
  secondaryBtnText: { color: C.text, fontSize: FONT.sm, fontWeight: '600' },
  primaryBtn: {
    flex: 2, backgroundColor: C.accent, borderRadius: CARD.radiusSm, paddingVertical: 12, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: FONT.sm, fontWeight: '700' },
  btnDisabled: { opacity: 0.4 },
  loadingStep: { color: C.textMid, fontSize: FONT.sm, textAlign: 'center', marginTop: SPACE.md },
  card: {
    backgroundColor: C.card, borderRadius: CARD.radius, borderWidth: CARD.borderWidth, borderColor: C.border,
    padding: CARD.padding, marginBottom: SPACE.md,
  },
  cardTitle: { color: C.accent, fontSize: FONT.xs, fontWeight: '700', letterSpacing: 1.5, marginBottom: SPACE.sm },
  cardLine: { color: C.text, fontSize: FONT.sm, lineHeight: 19, marginBottom: 3 },
  cardNote: { color: C.textMid, fontSize: FONT.xs, lineHeight: 16, fontStyle: 'italic', marginTop: 4 },
  elaImage: { width: '100%', height: 220, borderRadius: CARD.radiusSm, marginVertical: SPACE.sm, backgroundColor: C.surface },
  sectionLabel: { fontSize: FONT.xs, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
});
