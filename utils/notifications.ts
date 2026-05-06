// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import { Platform } from 'react-native';
// import api from './api';

// let tokenRefreshSubscription: Notifications.Subscription | null = null;

// // ─────────────────────────────────────────────────────────────────────────────
// // BACKGROUND TASK NAME
// // expo-notifications needs a registered TaskManager task to handle
// // notifications when the app is fully in the background or killed.
// // ─────────────────────────────────────────────────────────────────────────────
// // export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

// // // Register the background task — must be called at the TOP LEVEL of your app
// // // (outside any component), ideally in the root _layout.tsx or index.ts
// // TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }) => {
// //     if (error) {
// //         console.error('[Notifications] Background task error:', error);
// //         return;
// //     }
// //     // data.notification contains the full notification object
// //     // You can store it, update badges, etc. here
// //     console.log('[Notifications] Received in background:', data);
// // });

// // ─────────────────────────────────────────────────────────────────────────────
// // FOREGROUND BEHAVIOUR
// // Without this, notifications received while the app is open are silently
// // ignored. This tells expo-notifications to always display them visually.
// // ─────────────────────────────────────────────────────────────────────────────
// Notifications.setNotificationHandler({
//     handleNotification: async () => ({
//         shouldShowAlert: true,  // legacy — required
//         shouldPlaySound: true,
//         shouldSetBadge: true,
//         shouldShowBanner: true,  // banner drop-down (SDK 51+)
//         shouldShowList: true,  // notification centre (SDK 51+)
//     }),
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // REQUEST PERMISSIONS
// // On Android 13+ (API 33), POST_NOTIFICATIONS must be explicitly granted.
// // On iOS, the system permission dialog is shown.
// // ─────────────────────────────────────────────────────────────────────────────
// async function requestPermissions(): Promise<boolean> {
//     if (!Device.isDevice) {
//         console.warn('[Notifications] Push notifications require a physical device.');
//         return false;
//     }

//     // Check current permission status first
//     const { status: existingStatus } = await Notifications.getPermissionsAsync();

//     let finalStatus = existingStatus;

//     // Only ask if not already granted
//     if (existingStatus !== 'granted') {
//         const { status } = await Notifications.requestPermissionsAsync();
//         finalStatus = status;
//     }

//     if (finalStatus !== 'granted') {
//         console.warn('[Notifications] Permission not granted:', finalStatus);
//         return false;
//     }

//     // Android: create a notification channel (required for Android 8+)
//     // Without a channel, notifications are silently dropped on Android
//     if (Platform.OS === 'android') {
//         await Notifications.setNotificationChannelAsync('booking_updates', {
//             name: 'Booking Updates',
//             importance: Notifications.AndroidImportance.MAX,
//             vibrationPattern: [0, 250, 250, 250],
//             lightColor: '#FF6B35',       // your brand color
//             sound: 'default',
//             enableVibrate: true,
//             showBadge: true,
//             description: 'Notifications about your booking status',
//         });
//     }

//     return true;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // GET DEVICE PUSH TOKEN (Native FCM Token)
// // getDevicePushTokenAsync() returns the raw FCM token on Android
// // and APNs token on iOS — NOT an Expo push token.
// // This is what you send to your Django backend for firebase-admin to use.
// // ─────────────────────────────────────────────────────────────────────────────
// async function getDeviceToken(): Promise<string | null> {
//     try {
//         const tokenData = await Notifications.getDevicePushTokenAsync();
//         // tokenData.type  = 'android' | 'ios'
//         // tokenData.data  = the actual FCM / APNs token string
//         console.log('[Notifications] Device token:', tokenData.data);
//         return tokenData.data;
//     } catch (error) {
//         console.error('[Notifications] Failed to get device token:', error);
//         return null;
//     }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // SAVE TOKEN TO DJANGO BACKEND
// // Django stores this token against the logged-in user's profile.
// // When the garage owner changes booking status, Django uses this token
// // to send a targeted FCM notification via firebase-admin.
// // ─────────────────────────────────────────────────────────────────────────────
// async function saveTokenToBackend(token: string): Promise<void> {
//     try {
//         await api.post('/notifications/save-token/', {
//             // fcm_token: token,
//             token: token,
//             // platform: Platform.OS,  // 'android' | 'ios'
//         });
//         console.log('[Notifications] Token saved to backend successfully.');
//     } catch (error) {
//         console.error('[Notifications] Failed to save token to backend:', error);
//     }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // FULL SETUP — call this once after the user logs in
// // Handles permissions → token → backend save in one call
// // ─────────────────────────────────────────────────────────────────────────────
// // export async function setupPushNotifications(): Promise<void> {
// //     const permitted = await requestPermissions();
// //     if (!permitted) return;

// //     const token = await getDeviceToken();
// //     if (!token) return;

// //     await saveTokenToBackend(token);

// //     // Listen for token refresh — the OS can rotate FCM tokens.
// //     // When it does, update the backend immediately so notifications don't break.
// //     const subscription = Notifications.addPushTokenListener(async (newToken) => {
// //         console.log('[Notifications] Token refreshed:', newToken.data);
// //         await saveTokenToBackend(newToken.data);
// //     });

// //     // Note: store subscription ref if you need to remove it on logout
// //     // subscription.remove();
// // }
// export async function setupPushNotifications(): Promise<void> {
//     const permitted = await requestPermissions();
//     if (!permitted) return;

//     const token = await getDeviceToken();
//     if (!token) return;

//     await saveTokenToBackend(token);

//     // ✅ Remove old listener before adding new one
//     tokenRefreshSubscription?.remove();
//     tokenRefreshSubscription = Notifications.addPushTokenListener(async (newToken) => {
//         console.log('[Notifications] Token refreshed:', newToken.data);
//         await saveTokenToBackend(newToken.data);
//     });
// }

// // ✅ Call this on logout
// export function teardownPushNotifications(): void {
//     tokenRefreshSubscription?.remove();
//     tokenRefreshSubscription = null;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // FOREGROUND NOTIFICATION LISTENER
// // Fires when a notification arrives while the app is open.
// // expo-notifications handles display automatically (via setNotificationHandler).
// // Use this listener if you want to do anything extra (e.g. refresh booking list).
// // Returns a cleanup function — call it on unmount.
// // ─────────────────────────────────────────────────────────────────────────────
// export function listenForegroundNotifications(
//     onReceived?: (notification: Notifications.Notification) => void
// ): () => void {
//     const subscription = Notifications.addNotificationReceivedListener((notification) => {
//         console.log('[Notifications] Foreground notification:', notification);
//         onReceived?.(notification);
//     });

//     return () => subscription.remove();
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NOTIFICATION TAP LISTENER (Background + Foreground)
// // Fires when the user taps on a notification.
// // The response.notification.request.content.data contains the data payload
// // sent from Django (e.g. { screen: 'bookings', booking_id: '12', status: 'accepted' })
// // Use this to navigate to the correct screen.
// // Returns a cleanup function — call it on unmount.
// // ─────────────────────────────────────────────────────────────────────────────
// // export function listenNotificationTaps(
// //     onTap: (data: Record<string, string>) => void
// // ): () => void {
// //     const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
// //         console.log('[Notifications] Notification tapped:', response);
// //         const data = response.notification.request.content.data as Record<string, string>;
// //         if (data) onTap(data);
// //     });

// //     return () => subscription.remove();
// // }

// // // ─────────────────────────────────────────────────────────────────────────────
// // // KILLED STATE CHECK
// // // If the app was fully closed and user tapped a notification to open it,
// // // expo-notifications stores the last response. Check it once on app launch.
// // // ─────────────────────────────────────────────────────────────────────────────
// // export async function checkInitialNotification(): Promise<Record<string, string> | null> {
// //     const response = await Notifications.getLastNotificationResponseAsync();

// //     if (response) {
// //         console.log('[Notifications] App opened from killed state via notification.');
// //         const data = response.notification.request.content.data as Record<string, string>;
// //         return data ?? null;
// //     }

// //     return null;
// // }

// // ─────────────────────────────────────────────────────────────────────────────
// // NOTIFICATION TAP LISTENER
// // ─────────────────────────────────────────────────────────────────────────────
// export function listenNotificationTaps(
//     onTap: (data: Record<string, string>) => void
// ): () => void {
//     const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
//         console.log('[Notifications] Notification tapped:', response);
//         const data = response.notification.request.content.data as Record<string, string>;

//         // ✅ Guard against exp://–/ malformed deep links from Expo Go
//         const url = data?.url;
//         if (url && !url.startsWith('/')) {
//             console.warn('[Notifications] Blocked malformed deep link:', url);
//             return;
//         }

//         if (data) onTap(data);
//     });

//     return () => subscription.remove();
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // KILLED STATE CHECK
// // ─────────────────────────────────────────────────────────────────────────────
// export async function checkInitialNotification(): Promise<Record<string, string> | null> {
//     const response = await Notifications.getLastNotificationResponseAsync();

//     if (response) {
//         console.log('[Notifications] App opened from killed state via notification.');
//         const data = response.notification.request.content.data as Record<string, string>;

//         // ✅ Guard against malformed deep links on cold start
//         const url = data?.url;
//         if (url && !url.startsWith('/')) {
//             console.warn('[Notifications] Blocked malformed initial deep link:', url);
//             return null;
//         }

//         return data ?? null;
//     }

//     return null;
// }

// utils/notifications.ts

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// FOREGROUND BEHAVIOUR — set once at module level
// ─────────────────────────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,   // legacy — required
        shouldShowBanner: true,  // SDK 51+
        shouldShowList: true,  // SDK 51+
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// ANDROID CHANNEL — required for Android 8+
// ─────────────────────────────────────────────────────────────────────────────
export async function setupAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync('booking_updates', {
        name: 'Booking Updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        description: 'Notifications about your booking status',
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST OS PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
        console.warn('[Notifications] Push notifications require a physical device.');
        return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permission not granted:', finalStatus);
        return false;
    }

    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET RAW FCM / APNs TOKEN — no EAS, no projectId, no firebase SDK needed
// ─────────────────────────────────────────────────────────────────────────────
export async function getDevicePushToken(): Promise<string | null> {
    try {
        const tokenData = await Notifications.getDevicePushTokenAsync();
        // tokenData.type → 'android' | 'ios'
        // tokenData.data → the actual FCM / APNs token string
        console.log('[Notifications] Device token:', tokenData.data);
        return tokenData.data;
    } catch (error) {
        console.error('[Notifications] Failed to get device token:', error);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOREGROUND NOTIFICATION LISTENER
// Fires when a push arrives while the app is open.
// Returns a cleanup function — call it on unmount.
// ─────────────────────────────────────────────────────────────────────────────
export function listenForegroundNotifications(
    onReceived?: (notification: Notifications.Notification) => void
): () => void {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
        console.log('[Notifications] Foreground notification:', notification);
        onReceived?.(notification);
    });
    return () => sub.remove();
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION TAP LISTENER (foreground + background)
// data payload from Django: { screen: 'bookings', booking_id: '12', status: 'accepted' }
// Returns a cleanup function — call it on unmount.
// ─────────────────────────────────────────────────────────────────────────────
export function listenNotificationTaps(
    onTap: (data: Record<string, string>) => void
): () => void {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('[Notifications] Notification tapped:', response);
        const data = response.notification.request.content.data as Record<string, string>;

        // Guard against malformed deep links (e.g. exp://–/ from Expo Go)
        const url = data?.url;
        if (url && !url.startsWith('/')) {
            console.warn('[Notifications] Blocked malformed deep link:', url);
            return;
        }

        if (data) onTap(data);
    });
    return () => sub.remove();
}

// ─────────────────────────────────────────────────────────────────────────────
// KILLED STATE CHECK — check once on cold start
// ─────────────────────────────────────────────────────────────────────────────
export async function checkInitialNotification(): Promise<Record<string, string> | null> {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return null;

    console.log('[Notifications] App opened from killed state via notification.');
    const data = response.notification.request.content.data as Record<string, string>;

    const url = data?.url;
    if (url && !url.startsWith('/')) {
        console.warn('[Notifications] Blocked malformed initial deep link:', url);
        return null;
    }

    return data ?? null;
}