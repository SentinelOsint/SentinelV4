import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator,
  Platform, Animated,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { C, IS_IPAD, SPACE } from '../utils/theme';
import { initializeKeys }       from '../utils/secureStorage';
import { SessionManager }       from '../utils/sessionManager';
import { AuditLog }             from '../utils/auditLog';
import { runIntegrityCheck, IntegrityReport } from '../utils/integrityCheck';

interface Props {
  onUnlock: () => void;
  onAuthStart?: () => void;
  isReauth?: boolean;   // true = session timed out, not first launch
}

type LockState = 'checking' | 'ready' | 'authenticating' | 'failed' | 'locked_out' | 'integrity_warn';

export default function LockScreen({ onUnlock, onAuthStart, isReauth = false }: Props) {
  const [lockState,      setLockState]      = useState<LockState>('checking');
  const [biometricType,  setBiometricType]  = useState('Biometrics');
  const [errorMsg,       setErrorMsg]       = useState('');
  const [countdown,      setCountdown]      = useState(0);
  const [integrityRpt,   setIntegrityRpt]   = useState<IntegrityReport | null>(null);
  const [showIntWarning, setShowIntWarning] = useState(false);
  const [failedCount,    setFailedCount]    = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startup();
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  const startup = async () => {
    setLockState('checking');

    // 1. Integrity check
    const integrity = await runIntegrityCheck();
    setIntegrityRpt(integrity);
    if (integrity.level === 'critical') {
      setShowIntWarning(true);
      await AuditLog.log('INTEGRITY_CHECK_FAIL', integrity.flags.filter(f => !f.passed).map(f => f.detail).join('; '));
    } else {
      await AuditLog.log('INTEGRITY_CHECK_PASS', `Score: ${integrity.score}`);
    }

    // 2. Check lockout
    const lockout = await SessionManager.isLockedOut();
    if (lockout.locked) {
      setLockState('locked_out');
      startCountdown(lockout.remainingSeconds);
      return;
    }

    // 3. Check biometrics available
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled   = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) {
        // No biometrics – skip lock (show warning in settings)
        await _completeUnlock();
        return;
      }
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType(Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType(Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint');
      }
      setFailedCount(SessionManager.getFailedAttempts());
      setLockState('ready');
      // Small delay before auto-triggering biometrics to ensure UI is ready
      setTimeout(() => authenticate(), 1000);
    } catch {
      await _completeUnlock();
    }
  };

  const authenticate = async () => {
    if (onAuthStart) onAuthStart();
    setLockState('authenticating');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:       'Authenticate to access Sentinel',
        fallbackLabel:       'Use Passcode',
        cancelLabel:         'Cancel',
        disableDeviceFallback: false,
        requireConfirmation: false,
      });

      if (result.success) {
        await _completeUnlock();
      } else {
        await _handleFailure(result.error || 'unknown');
      }
    } catch {
      await _handleFailure('exception');
    }
  };

  const _completeUnlock = async () => {
    // Initialize encryption keys
    await initializeKeys();
    await AuditLog.initialize();
    await AuditLog.log('AUTH_SUCCESS', isReauth ? 'Session re-authenticated' : 'Initial unlock');
    await SessionManager.recordSuccessfulAuth();
    onUnlock();
  };

  const _handleFailure = async (error: string) => {
    const result = await SessionManager.recordFailedAttempt();
    await AuditLog.log('AUTH_FAILURE', `Error: ${error}, attempt #${SessionManager.getFailedAttempts()}`);

    _triggerShake();

    if (result.locked) {
      await AuditLog.log('AUTH_LOCKOUT', `Locked for ${result.waitSeconds}s`);
      setLockState('locked_out');
      startCountdown(result.waitSeconds);
    } else {
      const remaining = 5 - SessionManager.getFailedAttempts();
      setFailedCount(SessionManager.getFailedAttempts());
      setErrorMsg(
        error === 'user_cancel'  ? 'Tap to try again.' :
        error === 'lockout'      ? 'Too many attempts. Use device passcode.' :
        remaining > 0 ? `Authentication failed. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` :
        'Authentication failed.'
      );
      setLockState('failed');
    }
  };

  const startCountdown = (seconds: number) => {
    setCountdown(seconds);
    countdownRef.current = setInterval(async () => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setLockState('ready');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const _triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const icon = biometricType.includes('Face') ? '👁' : '🪪';

  const IntegrityWarning = () => integrityRpt && integrityRpt.level !== 'secure' ? (
    <TouchableOpacity
      style={[s.intWarning, integrityRpt.level === 'critical' && s.intCritical]}
      onPress={() => setShowIntWarning(v => !v)}
    >
      <Text style={[s.intWarningTitle, integrityRpt.level === 'critical' && { color: C.red }]}>
        {integrityRpt.level === 'critical' ? '⛔ Security Risk Detected' : '⚠️ Security Notice'}
      </Text>
      {showIntWarning && integrityRpt.flags.filter(f => !f.passed).map((f, i) => (
        <Text key={i} style={s.intWarningDetail}>• {f.detail || f.check}</Text>
      ))}
      <Text style={s.intWarningToggle}>{showIntWarning ? 'Hide details ▲' : 'Show details ▼'}</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.container}>

        <View style={s.logoWrap}>
          <Text style={s.logo}>SENTINEL</Text>
          <Text style={s.logoSub}>FIELD INTELLIGENCE PLATFORM</Text>
        </View>

        <IntegrityWarning />

        <Animated.View style={[s.lockWrap, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={[s.lockCircle, lockState === 'locked_out' && s.lockCircleRed]}>
            <Text style={s.lockEmoji}>
              {lockState === 'locked_out' ? '🔐' : lockState === 'failed' ? '⚠️' : '🔒'}
            </Text>
          </View>
          <Text style={s.lockTitle}>
            {isReauth         ? 'Session Expired'  :
             lockState === 'locked_out' ? 'Account Locked' :
             lockState === 'failed'     ? 'Access Denied'  : 'Secured'}
          </Text>
          <Text style={s.lockSub}>
            {lockState === 'checking'      ? 'Checking device security…'               :
             lockState === 'locked_out'    ? `Try again in ${countdown}s`              :
             lockState === 'authenticating'? `Waiting for ${biometricType}…`           :
             lockState === 'failed'        ? errorMsg                                  :
             `Authenticate with ${biometricType} to continue`}
          </Text>
          {isReauth && <Text style={s.reauthNote}>Your session timed out for security.</Text>}
          {failedCount > 0 && lockState !== 'locked_out' && (
            <Text style={s.attemptsNote}>{failedCount} failed attempt{failedCount !== 1 ? 's' : ''} recorded</Text>
          )}
        </Animated.View>

        {lockState === 'checking' || lockState === 'authenticating' ? (
          <ActivityIndicator color={C.accent} size="large" style={{ marginTop: SPACE.xl }} />
        ) : lockState === 'locked_out' ? (
          <View style={s.lockedBox}>
            <Text style={s.lockedCountdown}>{countdown}s</Text>
            <Text style={s.lockedMsg}>Too many failed attempts.{'\n'}Authentication suspended.</Text>
          </View>
        ) : (
          <TouchableOpacity style={s.authBtn} onPress={authenticate} activeOpacity={0.8}>
            <Text style={s.authBtnText}>{icon}  Authenticate with {biometricType}</Text>
          </TouchableOpacity>
        )}

        <View style={s.footer}>
          {integrityRpt && (
            <View style={[s.scoreBadge, { backgroundColor: integrityRpt.score >= 85 ? C.greenDim : integrityRpt.score >= 60 ? C.amberDim : C.redDim }]}>
              <Text style={[s.scoreText, { color: integrityRpt.score >= 85 ? C.green : integrityRpt.score >= 60 ? C.amber : C.red }]}>
                Security Score: {integrityRpt.score}/100
              </Text>
            </View>
          )}
          <Text style={s.footerNote}>Device-encrypted · No cloud sync · No telemetry</Text>

          {__DEV__ && (
  <TouchableOpacity onPress={_completeUnlock} style={{ marginTop: 24, padding: 12, backgroundColor: '#1a3a1a', borderRadius: 8 }}>
    <Text style={{ color: '#4CAF50', textAlign: 'center', fontSize: 12 }}>🛠 DEV: Skip Auth</Text>
  </TouchableOpacity>
)}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },
  container:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: IS_IPAD ? 120 : 32 },
  logoWrap:   { alignItems: 'center', marginBottom: IS_IPAD ? 32 : 24 },
  logo:       { fontSize: IS_IPAD ? 40 : 32, fontWeight: '900', color: C.accent, letterSpacing: IS_IPAD ? 8 : 6 },
  logoSub:    { fontSize: IS_IPAD ? 12 : 10, color: C.textDim, letterSpacing: 3, marginTop: 6 },
  intWarning: { width: '100%', backgroundColor: C.amberDim, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.amber },
  intCritical:{ backgroundColor: C.redDim, borderColor: C.red },
  intWarningTitle: { color: C.amber, fontWeight: '700', fontSize: 13, marginBottom: 4 },
  intWarningDetail:{ color: C.textMid, fontSize: 12, lineHeight: 18 },
  intWarningToggle:{ color: C.textDim, fontSize: 11, marginTop: 6 },
  lockWrap:   { alignItems: 'center', marginBottom: SPACE.xl, width: '100%' },
  lockCircle: { width: IS_IPAD ? 110 : 88, height: IS_IPAD ? 110 : 88, borderRadius: IS_IPAD ? 55 : 44, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: IS_IPAD ? 28 : 20 },
  lockCircleRed: { borderColor: C.red, backgroundColor: C.redDim },
  lockEmoji:  { fontSize: IS_IPAD ? 46 : 36 },
  lockTitle:  { color: C.text, fontSize: IS_IPAD ? 30 : 24, fontWeight: '700', marginBottom: 10 },
  lockSub:    { color: C.textMid, fontSize: IS_IPAD ? 16 : 14, textAlign: 'center', lineHeight: IS_IPAD ? 24 : 20 },
  reauthNote: { color: C.amber, fontSize: 12, marginTop: 8, textAlign: 'center' },
  attemptsNote: { color: C.red, fontSize: 12, marginTop: 6 },
  authBtn:    { backgroundColor: C.accent, borderRadius: 16, paddingVertical: IS_IPAD ? 20 : 16, paddingHorizontal: IS_IPAD ? 48 : 32, marginTop: IS_IPAD ? 24 : 18 },
  authBtnText:{ color: C.bg, fontWeight: '800', fontSize: IS_IPAD ? 18 : 16 },
  lockedBox:  { alignItems: 'center', marginTop: IS_IPAD ? 24 : 18, backgroundColor: C.redDim, borderRadius: 16, padding: 24, width: '100%', borderWidth: 1, borderColor: C.red },
  lockedCountdown: { color: C.red, fontSize: 48, fontWeight: '900', fontVariant: ['tabular-nums'] },
  lockedMsg:  { color: C.red, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  footer:     { position: 'absolute', bottom: IS_IPAD ? 48 : 32, alignItems: 'center', gap: 8 },
  scoreBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  scoreText:  { fontSize: 12, fontWeight: '700' },
  footerNote: { color: C.textDim, fontSize: IS_IPAD ? 13 : 11, textAlign: 'center' },
});
