#!/usr/bin/env python3
"""
Sentinel — KRIITTINEN korjaus: tilauksen validointi Applelta käynnistyksen yhteydessä
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')

OLD_INIT = """    if (unlocked) {
      Trial.initialize().then(async () => {
      const tier = await Trial.getSubscriptionTier();
      setSubscriptionTier(tier);
      setIsPro(tier === 'pro');
    });"""

NEW_INIT = """    if (unlocked) {
      Trial.initialize().then(async () => {
        // Validate subscription with Apple on every launch
        try {
          const { initConnection, getAvailablePurchases, endConnection } = await import('expo-iap');
          await initConnection();
          const purchases = await getAvailablePurchases();
          await endConnection();

          const SOLO_ID = 'com.sentinel.osint.solo.monthly';
          const PRO_ID  = 'com.sentinel.osint.pro.monthly';

          if (purchases && purchases.length > 0) {
            const hasPro  = purchases.some((p: any) => p.productId === PRO_ID);
            const hasSolo = purchases.some((p: any) => p.productId === SOLO_ID);
            if (hasPro) {
              await Trial.setSubscription('pro');
            } else if (hasSolo) {
              await Trial.setSubscription('solo');
            } else {
              // No active purchases — set expired
              await Trial.setSubscription('expired' as any);
            }
          } else {
            // No purchases found — check if trial is still active
            const trialActive = await Trial.isActive();
            if (!trialActive) {
              await Trial.setSubscription('expired' as any);
            }
          }
        } catch (e) {
          console.warn('Subscription validation failed:', e);
          // If validation fails, fall back to stored tier
        }

        const tier = await Trial.getSubscriptionTier();
        setSubscriptionTier(tier);
        setIsPro(tier === 'pro');
      });"""

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_INIT not in content:
        print("❌ Käynnistyslogiikkaa ei löydy — tarkista tiedosto")
        return False

    backup = FILE + '.backup_subscription_validation'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_INIT, NEW_INIT)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Tilauksen validointi Applelta lisätty käynnistyksen yhteydessä!")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
