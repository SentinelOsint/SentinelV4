iap_code = '''/**
 * SENTINEL – In-App Purchase Manager
 * react-native-iap v12 API
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
} from 'react-native-iap';
import { Trial } from './storage';
import { AuditLog } from './auditLog';

export const PRODUCT_IDS = {
  SOLO: 'com.sentinel.osint.solo.monthly',
  PRO:  'com.sentinel.osint.pro.monthly',
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
    if (purchaseUpdateSub) purchaseUpdateSub.remove();
    if (purchaseErrorSub) purchaseErrorSub.remove();

    purchaseUpdateSub = purchaseUpdatedListener(async (purchase: any) => {
      if (purchase.transactionReceipt || purchase.transactionId) {
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch {}
        const tier = purchase.productId === PRODUCT_IDS.PRO ? 'pro' : 'solo';
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

    await requestSubscription({ sku: productId, andDangerouslyFinishTransactionAutomaticallyIOS: false });
  } catch (e: any) {
    const code = e?.code || e?.message || '';
    if (!code.includes('CANCEL')) {
      onError(e?.message || 'Purchase failed');
    }
  }
}

export async function restorePurchasesIAP(
  onSuccess: (tier: 'solo' | 'pro') => void,
  onNotFound: () => void
): Promise<void> {
  try {
    const purchases = await getAvailablePurchases();
    if (purchases && purchases.length > 0) {
      const hasPro  = purchases.some((p: any) => p.productId === PRODUCT_IDS.PRO);
      const hasSolo = purchases.some((p: any) => p.productId === PRODUCT_IDS.SOLO);
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
  } catch {
    onNotFound();
  }
}
'''

with open('src/utils/iapManager.ts', 'w') as f:
    f.write(iap_code)
print('iapManager.ts updated!')
