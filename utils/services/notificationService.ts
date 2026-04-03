// utils/services/notificationService.ts

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';   // ✅ matches your api.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../api';                            // ✅ reuse your axios instance

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function setupAndroidChannel() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('bookings', {
            name: 'Booking Updates',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B35',
            sound: 'default',
        });
    }
}

export async function registerPushToken(): Promise<string | null> {
    if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices.');
        return null;
    }

    await setupAndroidChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Notification permission denied.');
        return null;
    }

    const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;

    // ✅ Use your existing axios instance — interceptor auto-attaches Bearer token
    try {
        await api.post('/users/push-token/', { push_token: pushToken });
        console.log('Push token registered with backend.');
    } catch (e) {
        console.warn('Failed to send push token to backend:', e);
    }

    return pushToken;
}