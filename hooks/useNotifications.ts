// hooks/useNotifications.ts

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
    setupPushNotifications,
    listenForegroundNotifications,
    listenNotificationTaps,
    checkInitialNotification,
} from '../utils/notifications';       // ✅ your existing file
import { useAuthStore } from '../store/authStore';

export function useNotifications() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);

    useEffect(() => {
        // Only run for logged-in customers
        if (!user || user.role !== 'customer') return;

        // 1. Request permissions + get FCM token + save to backend
        setupPushNotifications();

        // 2. Check if app was opened from a killed state by tapping a notification
        checkInitialNotification().then((data) => {
            if (data?.screen === 'bookings') {
                router.push('/(customer)/my-bookings' as any);
            }
        });

        // 3. Foreground: notification arrives while app is open
        const removeForeground = listenForegroundNotifications((notification) => {
            console.log('[useNotifications] Foreground:', notification.request.content.title);
            // Optionally refresh bookings list here:
            // queryClient.invalidateQueries(['my-bookings']);
        });

        // 4. Tap: user taps notification from tray
        const removeTap = listenNotificationTaps((data) => {
            if (data?.screen === 'bookings') {
                router.push('/(customer)/my-bookings' as any);
            }
        });

        // Cleanup listeners on logout / unmount
        return () => {
            removeForeground();
            removeTap();
        };

    }, [user]);
}