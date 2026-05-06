// utils/services/notificationService.ts

import api from '../api';
import {
    setupAndroidChannel,
    requestNotificationPermissions,
    getDevicePushToken,
} from '../notifications';
import * as Notifications from 'expo-notifications';

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN REFRESH SUBSCRIPTION — stored so it can be removed on logout
// ─────────────────────────────────────────────────────────────────────────────
let _tokenRefreshSub: Notifications.Subscription | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// SAVE TOKEN TO DJANGO BACKEND
// firebase-admin uses this token to send targeted FCM pushes server-side.
// ─────────────────────────────────────────────────────────────────────────────
async function saveTokenToBackend(token: string): Promise<void> {
    try {
        await api.post('/users/push-token/', { push_token: token });
        console.log('[Notifications] Token saved to backend.');
    } catch (e: any) {
        if (e?.response?.status === 404) {
            console.warn('[Notifications] /users/push-token/ endpoint not found.');
        } else {
            console.warn('[Notifications] Failed to save token:', e);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL SETUP — call once after user logs in
// permissions → android channel → token → backend save → refresh listener
// ─────────────────────────────────────────────────────────────────────────────
export async function setupPushNotifications(): Promise<string | null> {
    const permitted = await requestNotificationPermissions();
    if (!permitted) return null;

    await setupAndroidChannel();

    const token = await getDevicePushToken();
    if (!token) return null;

    await saveTokenToBackend(token);

    // Remove old listener before attaching a new one (e.g. after re-login)
    _tokenRefreshSub?.remove();
    _tokenRefreshSub = Notifications.addPushTokenListener(async (newToken) => {
        console.log('[Notifications] Token refreshed:', newToken.data);
        await saveTokenToBackend(newToken.data);
    });

    return token;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEARDOWN — call on logout to stop the token refresh listener
// ─────────────────────────────────────────────────────────────────────────────
export function teardownPushNotifications(): void {
    _tokenRefreshSub?.remove();
    _tokenRefreshSub = null;
    console.log('[Notifications] Teardown complete.');
}