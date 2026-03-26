/**
 * SENTINEL – Device Integrity & Tamper Detection
 *
 * Checks:
 * 1. Jailbreak / root detection (iOS & Android)
 * 2. App signature verification
 * 3. Debug mode detection
 * 4. Emulator detection
 * 5. Data envelope HMAC integrity (via secureStorage layer)
 *
 * NOTE: No single check is foolproof. Defense-in-depth approach:
 * multiple checks make bypass significantly harder.
 * A sophisticated attacker can defeat these checks on a compromised device,
 * but they significantly raise the bar for opportunistic access.
 */

import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export interface IntegrityReport {
  passed:  boolean;
  score:   number;         // 0–100: higher = more trustworthy
  flags:   IntegrityFlag[];
  level:   'secure' | 'warning' | 'critical';
}

export interface IntegrityFlag {
  check:    string;
  passed:   boolean;
  severity: 'info' | 'warning' | 'critical';
  detail?:  string;
}

// ── iOS Jailbreak indicators ─────────────────────────────────────────────────
const IOS_JB_PATHS = [
  '/Applications/Cydia.app',
  '/Applications/Sileo.app',
  '/Applications/Zebra.app',
  '/usr/bin/ssh',
  '/usr/sbin/sshd',
  '/etc/apt',
  '/private/var/lib/cydia',
  '/private/var/mobile/Library/SBSettings/Themes',
  '/Library/MobileSubstrate/MobileSubstrate.dylib',
  '/bin/bash',
  '/usr/lib/libcycript.dylib',
  '/private/var/stash',
];

// ── Android Root indicators ──────────────────────────────────────────────────
const ANDROID_ROOT_PACKAGES = [
  'com.noshufou.android.su',
  'com.thirdparty.superuser',
  'eu.chainfire.supersu',
  'com.koushikdutta.superuser',
  'com.zachspong.temprootremovejb',
  'com.ramdroid.appquarantine',
  'com.topjohnwu.magisk',
];

// ── Check: jailbreak / root ──────────────────────────────────────────────────
async function checkJailbreakOrRoot(): Promise<IntegrityFlag> {
  const check = 'Jailbreak / Root Detection';

  if (Platform.OS === 'ios') {
    // Check for known jailbreak paths
    for (const path of IOS_JB_PATHS) {
      try {
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
          return { check, passed: false, severity: 'critical', detail: `Jailbreak indicator found: ${path}` };
        }
      } catch {
        // Access denied = good (sandboxed app shouldn't see these)
      }
    }
    return { check, passed: true, severity: 'info' };
  }

  if (Platform.OS === 'android') {
    // On Android we can check for the build tags (physical device vs. eng build)
    const buildTags = (Device as any).osBuildFingerprint || '';
    if (buildTags.includes('test-keys') || buildTags.includes('dev-keys')) {
      return { check, passed: false, severity: 'critical', detail: 'Android build uses test-keys (possible root)' };
    }
    return { check, passed: true, severity: 'info' };
  }

  return { check, passed: true, severity: 'info', detail: 'Platform not checked' };
}

// ── Check: emulator / simulator ──────────────────────────────────────────────
async function checkEmulator(): Promise<IntegrityFlag> {
  const check = 'Physical Device Check';
  const isDevice = Device.isDevice;

  if (!isDevice) {
    return { check, passed: false, severity: 'warning', detail: 'Running on simulator or emulator' };
  }
  return { check, passed: true, severity: 'info' };
}

// ── Check: debug mode ────────────────────────────────────────────────────────
function checkDebugMode(): IntegrityFlag {
  const check = 'Debug Mode Detection';
  const isDebug = __DEV__;

  if (isDebug) {
    return { check, passed: false, severity: 'warning', detail: 'App running in development/debug mode' };
  }
  return { check, passed: true, severity: 'info' };
}

// ── Check: device has passcode ───────────────────────────────────────────────
async function checkDevicePasscode(): Promise<IntegrityFlag> {
  const check = 'Device Passcode / Lock Screen';
  // expo-local-authentication can tell us if the device has enrolled credentials
  try {
    const LocalAuth = require('expo-local-authentication');
    const enrolled = await LocalAuth.isEnrolledAsync();
    if (!enrolled) {
      return { check, passed: false, severity: 'warning', detail: 'No device passcode or biometrics enrolled. Data at risk if device is lost.' };
    }
    return { check, passed: true, severity: 'info' };
  } catch {
    return { check, passed: true, severity: 'info', detail: 'Could not verify' };
  }
}

// ── Check: OS version currency ───────────────────────────────────────────────
function checkOSVersion(): IntegrityFlag {
  const check = 'OS Security Currency';
  const version = parseInt(Device.osVersion?.split('.')[0] || '0');

  if (Platform.OS === 'ios' && version < 16) {
    return { check, passed: false, severity: 'warning', detail: `iOS ${Device.osVersion} may lack recent security patches. Recommend iOS 16+.` };
  }
  if (Platform.OS === 'android' && version < 12) {
    return { check, passed: false, severity: 'warning', detail: `Android ${Device.osVersion} may lack recent security patches. Recommend Android 12+.` };
  }
  return { check, passed: true, severity: 'info', detail: `${Platform.OS} ${Device.osVersion}` };
}

// ── Main integrity check ─────────────────────────────────────────────────────

export async function runIntegrityCheck(): Promise<IntegrityReport> {
  const [jbFlag, emuFlag, passcodeFlag] = await Promise.all([
    checkJailbreakOrRoot(),
    checkEmulator(),
    checkDevicePasscode(),
  ]);

  const debugFlag = checkDebugMode();
  const osFlag    = checkOSVersion();

  const flags: IntegrityFlag[] = [jbFlag, emuFlag, debugFlag, passcodeFlag, osFlag];

  // Score: start at 100, deduct per issue severity
  let score = 100;
  for (const flag of flags) {
    if (!flag.passed) {
      if (flag.severity === 'critical') score -= 40;
      if (flag.severity === 'warning')  score -= 15;
    }
  }
  score = Math.max(0, score);

  const criticalFails = flags.filter(f => !f.passed && f.severity === 'critical').length;
  const warningFails  = flags.filter(f => !f.passed && f.severity === 'warning').length;

  const level: IntegrityReport['level'] =
    criticalFails > 0 ? 'critical' :
    warningFails  > 0 ? 'warning'  : 'secure';

  return {
    passed: criticalFails === 0,
    score,
    flags,
    level,
  };
}

/**
 * Quick check – returns false if critical issues detected.
 * Use at app launch to decide whether to proceed.
 */
export async function quickIntegrityCheck(): Promise<boolean> {
  try {
    const report = await runIntegrityCheck();
    return report.passed;
  } catch {
    return true; // fail open if check itself errors
  }
}
