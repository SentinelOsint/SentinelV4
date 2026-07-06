/**
 * SENTINEL - Session Manager
 * Shake to lock added v2.4.0
 */

import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Accelerometer } from 'expo-sensors';
import { clearKeyMaterial, isSessionActive } from './secureStorage';

const SESSION_KEYS = {
  TIMEOUT_PREF:   'sentinel_session_timeout',
  FAILED_ATTEMPTS:'sentinel_failed_attempts',
  LOCKOUT_UNTIL:  'sentinel_lockout_until',
};

export const TIMEOUT_OPTIONS = [
  { label: '1 minute  (maximum security)',  value: 1   },
  { label: '5 minutes',                     value: 5   },
  { label: '15 minutes (recommended)',      value: 15  },
  { label: '30 minutes',                    value: 30  },
  { label: '1 hour',                        value: 60  },
  { label: 'Never (not recommended)',       value: 0   },
];

const MAX_FAILED_ATTEMPTS  = 5;
const LOCKOUT_BASE_SECONDS = 30;
const SHAKE_THRESHOLD      = 2.5;
const SHAKE_COOLDOWN_MS    = 2000;

class SessionManagerClass {
  private timeoutMs:      number   = 15 * 60 * 1000;
  private lastActivity:   number   = Date.now();
  private timeoutHandle:  ReturnType<typeof setTimeout> | null = null;
  private appStateListener: any    = null;
  private onLockCallback: (() => void) | null = null;
  private failedAttempts: number   = 0;
  private shakeSubscription: any   = null;
  private lastShakeTime:  number   = 0;
  private shakeEnabled:   boolean  = true;
  private isAuthenticating: boolean = false;

  async initialize(onLock: () => void): Promise<void> {
    this.onLockCallback = onLock;
    const savedTimeout  = await SecureStore.getItemAsync(SESSION_KEYS.TIMEOUT_PREF);
    const savedFailed   = await SecureStore.getItemAsync(SESSION_KEYS.FAILED_ATTEMPTS);
    if (savedTimeout !== null) {
      const minutes = parseInt(savedTimeout);
      this.timeoutMs = minutes === 0 ? 0 : minutes * 60 * 1000;
    }
    if (savedFailed !== null) {
      this.failedAttempts = parseInt(savedFailed);
    }
    // AppState handled by App.tsx to avoid conflicts with biometric auth
    // this.appStateListener = AppState.addEventListener('change', this._handleAppStateChange.bind(this));
    this._scheduleTimeout();
    this._startShakeDetection();
  }

  teardown(): void {
    if (this.appStateListener) this.appStateListener.remove();
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    this._stopShakeDetection();
    clearKeyMaterial();
  }

  private _startShakeDetection(): void {
    try {
      Accelerometer.setUpdateInterval(100);
      this.shakeSubscription = Accelerometer.addListener(({ x, y, z }) => {
        if (!this.shakeEnabled) return;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();
        if (magnitude > SHAKE_THRESHOLD && now - this.lastShakeTime > SHAKE_COOLDOWN_MS) {
          this.lastShakeTime = now;
          this._lock('manual');
        }
      });
    } catch {
      // Accelerometer not available - fail silently
    }
  }

  private _stopShakeDetection(): void {
    if (this.shakeSubscription) {
      this.shakeSubscription.remove();
      this.shakeSubscription = null;
    }
  }

  setShakeToLock(enabled: boolean): void { this.shakeEnabled = enabled; }
  getShakeEnabled(): boolean { return this.shakeEnabled; }
  setAuthenticating(val: boolean): void { this.isAuthenticating = val; }

  touch(): void {
    this.lastActivity = Date.now();
    if (this.timeoutMs > 0) {
      if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
      this._scheduleTimeout();
    }
  }

  async recordFailedAttempt(): Promise<{ locked: boolean; waitSeconds: number }> {
    this.failedAttempts++;
    await SecureStore.setItemAsync(SESSION_KEYS.FAILED_ATTEMPTS, String(this.failedAttempts));
    if (this.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const waitSeconds = LOCKOUT_BASE_SECONDS * Math.pow(2, Math.floor(this.failedAttempts / MAX_FAILED_ATTEMPTS) - 1);
      const lockoutUntil = Date.now() + waitSeconds * 1000;
      await SecureStore.setItemAsync(SESSION_KEYS.LOCKOUT_UNTIL, String(lockoutUntil));
      return { locked: true, waitSeconds };
    }
    return { locked: false, waitSeconds: 0 };
  }

  async recordSuccessfulAuth(): Promise<void> {
    this.failedAttempts = 0;
    this.lastActivity   = Date.now();
    await SecureStore.deleteItemAsync(SESSION_KEYS.FAILED_ATTEMPTS);
    await SecureStore.deleteItemAsync(SESSION_KEYS.LOCKOUT_UNTIL);
  }

  async isLockedOut(): Promise<{ locked: boolean; remainingSeconds: number }> {
    const lockoutUntil = await SecureStore.getItemAsync(SESSION_KEYS.LOCKOUT_UNTIL);
    if (!lockoutUntil) return { locked: false, remainingSeconds: 0 };
    const until = parseInt(lockoutUntil);
    const now   = Date.now();
    if (now >= until) {
      await SecureStore.deleteItemAsync(SESSION_KEYS.LOCKOUT_UNTIL);
      return { locked: false, remainingSeconds: 0 };
    }
    return { locked: true, remainingSeconds: Math.ceil((until - now) / 1000) };
  }

  getFailedAttempts(): number { return this.failedAttempts; }

  async setTimeoutMinutes(minutes: number): Promise<void> {
    this.timeoutMs = minutes === 0 ? 0 : minutes * 60 * 1000;
    await SecureStore.setItemAsync(SESSION_KEYS.TIMEOUT_PREF, String(minutes));
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    this._scheduleTimeout();
  }

  async getTimeoutMinutes(): Promise<number> {
    const saved = await SecureStore.getItemAsync(SESSION_KEYS.TIMEOUT_PREF);
    return saved !== null ? parseInt(saved) : 15;
  }

  getRemainingSeconds(): number {
    if (this.timeoutMs === 0) return Infinity;
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, Math.ceil((this.timeoutMs - elapsed) / 1000));
  }

  private _scheduleTimeout(): void {
    if (this.timeoutMs === 0) return;
    this.timeoutHandle = setTimeout(() => {
      this._lock('timeout');
    }, this.timeoutMs);
  }

  private _lock(reason: 'timeout' | 'background' | 'manual'): void {
    clearKeyMaterial();
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    if (this.onLockCallback) this.onLockCallback();
  }

  private _handleAppStateChange(nextState: AppStateStatus): void {
    console.log("[SESSION] AppState changed to:", nextState, "isAuthenticating:", this.isAuthenticating);
    if (nextState === 'background' || nextState === 'inactive') {
      if (!this.isAuthenticating) clearKeyMaterial();
      if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    } else if (nextState === 'active') {
      console.log("[SESSION] Returning to active, isSessionActive:", isSessionActive(), "isAuthenticating:", this.isAuthenticating);
      if (!isSessionActive() && !this.isAuthenticating) {
        console.log("[SESSION] Triggering lock callback");
        if (this.onLockCallback) this.onLockCallback();
      } else {
        this.touch();
      }
    }
  }
}

export const SessionManager = new SessionManagerClass();
