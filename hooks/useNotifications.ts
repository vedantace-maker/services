// // hooks/useNotifications.ts

// import { useEffect } from 'react';
// import { useRouter } from 'expo-router';
// import * as Notifications from 'expo-notifications';
// import {
//     setupPushNotifications,
//     listenForegroundNotifications,
//     listenNotificationTaps,
//     checkInitialNotification,
// } from '../utils/notifications';
// import { useAuthStore } from '../store/authStore';

// export function useNotifications() {
//     const router = useRouter();
//     const user = useAuthStore((s) => s.user);

//     useEffect(() => {
//         // Only run for logged-in customers
//         if (!user || user.role !== 'customer') return;

//         // 1. Request permissions + get FCM token + save to backend
//         setupPushNotifications();

//         // 2. App opened from killed state by tapping a notification
//         checkInitialNotification().then((data) => {
//             if (data?.screen === 'bookings') {
//                 router.push('/(customer)/my-bookings' as any);
//             }
//         });

//         // 3. Foreground: notification arrives while app is open
//         const removeForeground = listenForegroundNotifications((notification) => {
//             console.log('[useNotifications] Foreground:', notification.request.content.title);
//         });

//         // 4. Tap: user taps notification from tray
//         //    ✅ Guard against exp:// deep links — only navigate to internal paths
//         const removeTap = listenNotificationTaps((data) => {
//             // Guard: if data contains a raw URL, only allow internal paths
//             if (data?.url && !String(data.url).startsWith('/')) {
//                 console.warn('[useNotifications] Ignoring malformed deep link:', data.url);
//                 return;
//             }

//             if (data?.screen === 'bookings') {
//                 router.push('/(customer)/my-bookings' as any);
//             }
//         });

//         // 5. ✅ Response listener as extra safety net — catches exp://–/ links
//         //    that bypass listenNotificationTaps and go directly to Expo Router
//         const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
//             const data = response.notification.request.content.data;
//             const url = data?.url as string | undefined;

//             // Only navigate if it's a clean internal path
//             if (url) {
//                 if (url.startsWith('/')) {
//                     router.push(url as any);
//                 } else {
//                     console.warn('[useNotifications] Blocked external deep link:', url);
//                 }
//             }
//         });

//         return () => {
//             removeForeground();
//             removeTap();
//             responseSub.remove();   // ✅ clean up response listener
//         };

//     }, [user]);
// }


// hooks/useNotifications.ts

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
    listenForegroundNotifications,
    listenNotificationTaps,
    checkInitialNotification,
} from '../utils/notifications';
import { setupPushNotifications } from '../utils/services/notificationService';
import { useAuthStore } from '../store/authStore';

export function useNotifications() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);

    useEffect(() => {
        if (!user || user.role !== 'customer') return;

        setupPushNotifications();

        checkInitialNotification().then((data) => {
            if (data?.screen === 'bookings') {
                router.push('/(customer)/my-bookings' as any);
            }
        });

        const removeForeground = listenForegroundNotifications((notification) => {
            console.log('[useNotifications] Foreground:', notification.request.content.title);
        });

        const removeTap = listenNotificationTaps((data) => {
            if (data?.screen === 'bookings') {
                router.push('/(customer)/my-bookings' as any);
            }
        });

        return () => {
            removeForeground();
            removeTap();
        };

    }, [user]);
}