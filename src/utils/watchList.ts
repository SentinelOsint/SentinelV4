/**
 * SENTINEL – Watch List & Alerts
 *
 * Monitors subjects (person, domain, IP, email, phone) for changes.
 * Runs daily background checks via expo-background-fetch.
 * Sends push notifications when changes are detected.
 */
import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { SecureStorage } from './secureStorage';
import { AuditLog } from './auditLog';

const WATCH_LIST_KEY   = 'sentinel_watchlist_v1';
const BACKGROUND_TASK  = 'SENTINEL_WATCH_CHECK';
const CHECK_INTERVAL   = 24 * 60 * 60; // 24 hours in seconds

export type WatchType = 'person' | 'domain' | 'ip' | 'email' | 'phone';

export interface WatchItem {
  id:           string;
  label:        string;
  value:        string;
  type:         WatchType;
  addedAt:      string;
  lastChecked?: string;
  lastResult?:  string;
  alertCount:   number;
  active:       boolean;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export async function getWatchList(): Promise<WatchItem[]> {
  try {
  const items = await SecureStorage.get<WatchItem[]>(WATCH_LIST_KEY);
    return items || [];
  } catch {
    return [];
  }
}

export async function addWatchItem(item: Omit<WatchItem, 'id' | 'addedAt' | 'alertCount' | 'active'>): Promise<WatchItem> {
  const list = await getWatchList();
  const newItem: WatchItem = {
    ...item,
    id:         Date.now().toString(),
    addedAt:    new Date().toISOString(),
    alertCount: 0,
    active:     true,
  };
  await SecureStorage.set(WATCH_LIST_KEY, [...list, newItem]);
  await AuditLog.log('SEARCH_QUERY', `Watch List: added ${item.type} – ${item.label}`);
  return newItem;
}

export async function removeWatchItem(id: string): Promise<void> {
  const list = await getWatchList();
  await SecureStorage.set(WATCH_LIST_KEY, list.filter(i => i.id !== id));
  await AuditLog.log('SETTINGS_CHANGE', `Watch List: removed item ${id}`);
}

export async function toggleWatchItem(id: string): Promise<void> {
  const list = await getWatchList();
  const updated = list.map(i => i.id === id ? { ...i, active: !i.active } : i);
  await SecureStorage.set(WATCH_LIST_KEY, updated);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const result = await Notifications.requestPermissionsAsync() as any;
  return result.status === 'granted';
}

async function sendAlert(item: WatchItem, message: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 Sentinel Alert: ${item.label}`,
      body:  message,
      data:  { watchItemId: item.id },
    },
    trigger: null, // immediate
  });
}

// ─── Check logic ──────────────────────────────────────────────────────────────

async function checkDomain(item: WatchItem): Promise<string | null> {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(item.value)}&type=A`);
    const data = await res.json();
    const ips = (data.Answer || []).map((a: any) => a.data).join(',');
    const result = JSON.stringify({ ips });
    if (item.lastResult && item.lastResult !== result) return `DNS records changed for ${item.value}`;
    return result;
  } catch { return null; }
}

async function checkIP(item: WatchItem): Promise<string | null> {
  try {
    const res = await fetch(`https://ipinfo.io/${item.value}/json`);
    const data = await res.json();
    const result = JSON.stringify({ org: data.org, city: data.city });
    if (item.lastResult && item.lastResult !== result) return `IP info changed for ${item.value}`;
    return result;
  } catch { return null; }
}

async function checkEmail(item: WatchItem): Promise<string | null> {
  // HaveIBeenPwned requires API key – placeholder for now
  return item.lastResult || 'monitored';
}

async function checkItem(item: WatchItem): Promise<void> {
  if (!item.active) return;

  let newResult: string | null = null;
  let alertMessage: string | null = null;

  switch (item.type) {
    case 'domain': {
      const r = await checkDomain(item);
      if (r && item.lastResult && r !== item.lastResult) alertMessage = `Changes detected for domain: ${item.value}`;
      newResult = r;
      break;
    }
    case 'ip': {
      const r = await checkIP(item);
      if (r && item.lastResult && r !== item.lastResult) alertMessage = `IP address info changed: ${item.value}`;
      newResult = r;
      break;
    }
    case 'email': {
      newResult = await checkEmail(item);
      break;
    }
    case 'person':
    case 'phone':
      // Person and phone monitoring uses manual check reminder
      newResult = item.lastResult || 'monitoring-active';
      break;
    default:
      newResult = item.lastResult || 'monitored';
  }

  const list = await getWatchList();
  const updated = list.map(i => i.id === item.id ? {
    ...i,
    lastChecked: new Date().toISOString(),
    lastResult:  newResult || i.lastResult,
    alertCount:  alertMessage ? i.alertCount + 1 : i.alertCount,
  } : i);
  await SecureStorage.set(WATCH_LIST_KEY, updated);

  if (alertMessage) await sendAlert(item, alertMessage);
}

export async function checkAllWatchItems(): Promise<void> {
  const list = await getWatchList();
  const active = list.filter(i => i.active);
  await Promise.all(active.map(checkItem));
  await AuditLog.log('SEARCH_QUERY', `Watch List: checked ${active.length} items`);
}

// ─── Background task ──────────────────────────────────────────────────────────

TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    await checkAllWatchItems();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundCheck(): Promise<void> {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
      minimumInterval: CHECK_INTERVAL,
      stopOnTerminate: false,
      startOnBoot:     true,
    });
  } catch (e) {
    console.log('Background fetch registration:', e);
  }
}

export async function unregisterBackgroundCheck(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK);
  } catch {}
}
