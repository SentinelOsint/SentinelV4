/**
 * SENTINEL – In-App Purchase Manager
 * expo-iap API
 */
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  getAvailablePurchases,
} from 'expo-iap';
import { Trial } from './storage';
import { AuditLog } from './auditLog';

export const PRODUCT_IDS = {
  PRO: 'com.sentinel.osint.pro.monthly',
};

let purchaseUpdateSub: any = null;
let purchaseErrorSub: any = null;

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
    if (purchaseUpdateSub) purchaseUpdateSub.remove();
    if (purchaseErrorSub) purchaseErrorSub.remove();
    await endConnection();
  } catch {}
}

export async function getProducts() {
  try {
    const products = await fetchProducts({
      skus: [PRODUCT_IDS.PRO],
      type: 'subs',
    });
    return products;
  } catch (e) {
    console.warn('getProducts failed:', e);
    return [];
  }
}

export async function purchaseSubscription(
  productId: string,
  onSuccess: (tier: 'pro') => void,
  onError: (msg: string) => void
): Promise<void> {
  try {
    if (purchaseUpdateSub) purchaseUpdateSub.remove();
    if (purchaseErrorSub) purchaseErrorSub.remove();

    purchaseUpdateSub = purchaseUpdatedListener(async (purchase: any) => {
      if (purchase.transactionReceipt || purchase.transactionId) {
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch {}
        const tier: 'pro' = 'pro';
        await Trial.setSubscription(tier);
        await AuditLog.log('SETTINGS_CHANGE', `IAP subscription: ${tier}`);
        onSuccess(tier);
      }
    });

    purchaseErrorSub = purchaseErrorListener((error: any) => {
      const code = error?.code || '';
      if (code !== 'E_USER_CANCELLED' && code !== 'E_USER_CANCELED') {
        onError(error?.message || 'Purchase failed');
      }
    });

    await requestPurchase({
      request: {
        apple: { sku: productId },
      },
      type: 'subs',
    });
  } catch (e: any) {
    const code = e?.code || e?.message || '';
    if (!code.includes('CANCEL')) {
      onError(e?.message || 'Purchase failed');
    }
  }
}

export async function restorePurchasesIAP(
  onSuccess: (tier: 'pro') => void,
  onNotFound: () => void
): Promise<void> {
  try {
    const purchases = await getAvailablePurchases();
    if (purchases && purchases.length > 0) {
      // Server-side validation for each purchase
      for (const purchase of purchases) {
        const receipt = (purchase as any).transactionReceipt;
        if (!receipt) continue;
        try {
          const res = await fetch('https://sentinel-backend-production-05e1.up.railway.app/iap/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiptData: receipt }),
          });
          const data = await res.json();
          if (data.valid && data.tier === 'pro') {
            await Trial.setSubscription('pro');
            await AuditLog.log('SETTINGS_CHANGE', `Restore validated: ${data.tier}`);
            onSuccess(data.tier);
            return;
          }
        } catch {
          // Server validation failed for this receipt, try next
        }
      }
      // No valid active subscription found
      await Trial.setSubscription('expired');
      onNotFound();
    } else {
      onNotFound();
    }
  } catch {
    onNotFound();
  }
}
