/**
 * SENTINEL – Upgrade / Paywall Screen
 * Shown when trial expires or user hits a feature limit.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { C, IS_IPAD, SPACE } from '../utils/theme';
import { Trial, SubscriptionTier } from '../utils/storage';

interface Props {
  reason?: 'expired' | 'ai' | 'pdf' | 'cases' | 'one_input';
  onBack:  () => void;
  onSubscribe: (tier: 'solo' | 'pro') => void;
}

const REASONS: Record<string, { title: string; desc: string }> = {
  expired:   { title: 'Your trial has ended', desc: 'Subscribe to continue using Sentinel.' },
  ai:        { title: 'AI features are Pro only', desc: 'Upgrade to Pro to access AI-powered analysis, risk profiling, and investigation summaries.' },
  pdf:       { title: 'PDF export requires a subscription', desc: 'Subscribe to Solo or Pro to export professional investigation reports.' },
  cases:     { title: 'Case limit reached', desc: 'Trial allows 1 active case. Subscribe to manage unlimited investigations.' },
  one_input: { title: 'Daily search limit reached', desc: 'Trial allows 2 One-Input searches per day. Subscribe for unlimited searches.' },
};

export default function UpgradeScreen({ reason = 'expired', onBack, onSubscribe }: Props) {
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [tier, setTier]         = useState<SubscriptionTier>('trial');

  useEffect(() => {
    (async () => {
      const days = await Trial.getDaysRemaining();
      const t    = await Trial.getSubscriptionTier();
      setDaysLeft(days);
      setTier(t);
    })();
  }, []);

  const { title, desc } = REASONS[reason] || REASONS.expired;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>

        <View style={s.hero}>
          <Text style={s.heroIcon}>🛡️</Text>
          <Text style={s.heroTitle}>{title}</Text>
          <Text style={s.heroDesc}>{desc}</Text>
          {tier === 'trial' && daysLeft > 0 && (
            <View style={s.trialBadge}>
              <Text style={s.trialBadgeTxt}>{daysLeft} days remaining in trial</Text>
            </View>
          )}
        </View>

        <View style={s.plans}>

          <View style={s.planCard}>
            <View style={s.planHeader}>
              <Text style={s.planName}>Solo</Text>
              <View style={s.planPriceRow}>
                <Text style={s.planPrice}>$29</Text>
                <Text style={s.planPeriod}>/mo</Text>
              </View>
            </View>
            <View style={s.features}>
              <Text style={s.feature}>✓ All 12 OSINT modules</Text>
              <Text style={s.feature}>✓ One-Input Intelligence Search</Text>
              <Text style={s.feature}>✓ Investigation Timeline</Text>
              <Text style={s.feature}>✓ Unlimited cases</Text>
              <Text style={s.feature}>✓ PDF export</Text>
              <Text style={s.feature}>✓ Field Notes & History</Text>
              <Text style={s.featureNo}>✗ AI features</Text>
            </View>
            <TouchableOpacity style={s.soloBtn} onPress={() => onSubscribe('solo')}>
              <Text style={s.soloBtnTxt}>Subscribe to Solo</Text>
            </TouchableOpacity>
          </View>

          <View style={[s.planCard, s.planCardPro]}>
            <View style={s.proBadge}>
              <Text style={s.proBadgeTxt}>MOST POPULAR</Text>
            </View>
            <View style={s.planHeader}>
              <Text style={[s.planName, s.planNamePro]}>Pro</Text>
              <View style={s.planPriceRow}>
                <Text style={[s.planPrice, s.planPricePro]}>$79</Text>
                <Text style={[s.planPeriod, s.planPeriodPro]}>/mo</Text>
              </View>
            </View>
            <View style={s.features}>
              <Text style={[s.feature, s.featurePro]}>✓ Everything in Solo</Text>
              <Text style={[s.feature, s.featurePro]}>✓ FBI & Interpol auto wanted checks</Text>
              <Text style={[s.feature, s.featurePro]}>✓ All 50 US states + Canada wanted lists</Text>
              <Text style={[s.feature, s.featurePro]}>✓ 7 AI-powered features</Text>
              <Text style={[s.feature, s.featurePro]}>✓ 100 AI queries/month</Text>
              <Text style={[s.feature, s.featurePro]}>✓ Risk profiling</Text>
              <Text style={[s.feature, s.featurePro]}>✓ Contradiction detection</Text>
              <Text style={[s.feature, s.featurePro]}>✓ AI image analysis</Text>
              <Text style={[s.feature, s.featurePro]}>✓ AI investigation summary</Text>
            </View>
            <TouchableOpacity style={s.proBtn} onPress={() => onSubscribe('pro')}>
              <Text style={s.proBtnTxt}>Subscribe to Pro</Text>
            </TouchableOpacity>
            <View style={s.foundingBanner}>
              <Text style={s.foundingBannerTxt}>🔒 FOUNDING MEMBER PRICE</Text>
              <Text style={s.foundingBannerDesc}>First 200 subscribers locked at $79/mo forever</Text>
            </View>
          </View>
        </View>

        <Text style={s.legal}>
          Subscriptions auto-renew. Cancel anytime in App Store settings.{'\n'}
          Not a CRA. Not for employment/credit/tenant screening.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.bg },
  header:         { paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:        { alignSelf: 'flex-start' },
  backTxt:        { color: C.accent, fontSize: 15 },
  content:        { padding: IS_IPAD ? 32 : 16, paddingBottom: 40 },
  hero:           { alignItems: 'center', marginBottom: 28 },
  heroIcon:       { fontSize: 48, marginBottom: 12 },
  heroTitle:      { color: C.text, fontSize: IS_IPAD ? 26 : 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  heroDesc:       { color: C.textMid, fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  trialBadge:     { marginTop: 12, backgroundColor: C.amberDim, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  trialBadgeTxt:  { color: C.amber, fontSize: 13, fontWeight: '600' },
  plans:          { gap: 16 },
  planCard:       { backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border },
  planCardPro:    { borderColor: C.accent, borderWidth: 2 },
  planHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planName:       { color: C.text, fontSize: 20, fontWeight: '800' },
  planNamePro:    { color: C.accent },
  planPriceRow:   { flexDirection: 'row', alignItems: 'baseline' },
  planPrice:      { color: C.text, fontSize: 28, fontWeight: '800' },
  planPricePro:   { color: C.accent },
  planPeriod:     { color: C.textMid, fontSize: 14, marginLeft: 2 },
  planPeriodPro:  { color: C.accent },
  features:       { gap: 8, marginBottom: 20 },
  feature:        { color: C.textMid, fontSize: 14 },
  featurePro:     { color: C.text },
  featureNo:      { color: C.textDim, fontSize: 14 },
  proBadge:       { backgroundColor: C.accentDim, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 12 },
  proBadgeTxt:    { color: C.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  soloBtn:        { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  soloBtnTxt:     { color: C.text, fontSize: 16, fontWeight: '700' },
  proBtn:         { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  proBtnTxt:      { color: C.bg, fontSize: 16, fontWeight: '800' },
  foundingNote:   { color: C.textDim, fontSize: 11, textAlign: 'center', marginTop: 10, lineHeight: 16 },
  planCardAnnual: { borderColor: C.green, borderWidth: 2 },
  planNameAnnual: { color: C.green },
  planPriceAnnual: { color: C.green },
  planPeriodAnnual: { color: C.green },
  featureAnnual:  { color: C.text },
  annualEquiv:    { color: C.green, fontSize: 12, marginBottom: 14, marginTop: -10 },
  annualBtn:      { backgroundColor: C.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  annualBtnTxt:   { color: C.bg, fontSize: 16, fontWeight: '800' },
  legal:          { color: C.textDim, fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 16 },
  foundingBanner: { backgroundColor: C.amberDim, borderRadius: 10, padding: 10, marginTop: 12, alignItems: 'center' },
  foundingBannerTxt: { color: C.amber, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  foundingBannerDesc: { color: C.amber, fontSize: 11, marginTop: 3, opacity: 0.8 },
});