iap_code = '''/**
 * SENTINEL – In-App Purchase Manager
 * Handles App Store subscriptions via react-native-iap
 */
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  getAvailablePurchases,
  Purchase,
  SubscriptionPurchase,
  PurchaseError,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { Trial } from './storage';
import { AuditLog } from './auditLog';

export const PRODUCT_IDS = {
  SOLO: 'com.sentinel.osint.solo.monthly',
  PRO:  'com.sentinel.osint.pro.monthly',
};

export type IAPStatus = 'idle' | 'loading' | 'success' | 'error';

let purchaseUpdateSubscription: any = null;
let purchaseErrorSubscription: any = null;

export async function initIAP(): Promise<boolean> {
  try {
    await initConnection();
    return true;
  } catch (e) {
    console.warn('IAP init failed:', e);
    return false;
  }
}

export async function endIAP(): Promise<void> {
  try {
    if (purchaseUpdateSubscription) purchaseUpdateSubscription.remove();
    if (purchaseErrorSubscription) purchaseErrorSubscription.remove();
    await endConnection();
  } catch {}
}

export async function getProducts() {
  try {
    const products = await getSubscriptions({
      skus: [PRODUCT_IDS.SOLO, PRODUCT_IDS.PRO],
    });
    return products;
  } catch (e) {
    console.warn('getProducts failed:', e);
    return [];
  }
}

export async function purchaseSubscription(
  productId: string,
  onSuccess: (tier: 'solo' | 'pro') => void,
  onError: (msg: string) => void
): Promise<void> {
  try {
    purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: Purchase | SubscriptionPurchase) => {
      if (purchase.transactionReceipt) {
        await finishTransaction({ purchase, isConsumable: false });
        const tier = purchase.productId === PRODUCT_IDS.PRO ? 'pro' : 'solo';
        await Trial.setSubscription(tier);
        await AuditLog.log('SETTINGS_CHANGE', `IAP subscription: ${tier}`);
        onSuccess(tier);
      }
    });

    purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
      if (error.code !== 'E_USER_CANCELLED') {
        onError(error.message || 'Purchase failed');
      }
    });

    await requestSubscription({ sku: productId });
  } catch (e: any) {
    onError(e.message || 'Purchase failed');
  }
}

export async function restorePurchases(
  onSuccess: (tier: 'solo' | 'pro') => void,
  onNotFound: () => void
): Promise<void> {
  try {
    const purchases = await getAvailablePurchases();
    if (purchases && purchases.length > 0) {
      // Find highest tier
      const hasPro  = purchases.some(p => p.productId === PRODUCT_IDS.PRO);
      const hasSolo = purchases.some(p => p.productId === PRODUCT_IDS.SOLO);
      if (hasPro) {
        await Trial.setSubscription('pro');
        onSuccess('pro');
      } else if (hasSolo) {
        await Trial.setSubscription('solo');
        onSuccess('solo');
      } else {
        onNotFound();
      }
    } else {
      onNotFound();
    }
  } catch (e: any) {
    onNotFound();
  }
}
'''

with open('src/utils/iapManager.ts', 'w') as f:
    f.write(iap_code)
print('iapManager.ts created!')
