// app/(customer)/_layout.tsx

import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Typography } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
    setupPushNotifications,
    listenForegroundNotifications,  // ✅ was: listenForegroundMessages
    listenNotificationTaps,         // ✅ was: listenBackgroundNotificationTap
    checkInitialNotification,       // ✅ was: checkKilledStateNotification
} from '../../utils/notifications';


type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];


function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
    return (
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
            <Ionicons
                name={name}
                size={20}
                color={focused ? Colors.primary : Colors.textTertiary}
            />
        </View>
    );
}


export default function CustomerLayout() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const handleNotificationTap = (data: Record<string, string>) => {
        // Route user to the right screen based on Django's data payload
        if (data?.screen === 'bookings') {
            router.push('/(customer)/my-bookings' as any);
        }
    };

    useEffect(() => {
        // 1 — Request permissions, get FCM token, save to Django backend
        setupPushNotifications();

        // 2 — Foreground: notification arrives while app is open
        //     expo-notifications displays it automatically via setNotificationHandler.
        //     Pass a callback if you want to react in-app (e.g. refetch bookings).
        const unsubForeground = listenForegroundNotifications((notification) => {
            console.log('[Layout] Foreground notification:', notification.request.content.data);
            // Optional: queryClient.invalidateQueries(['bookings']);
        });

        // 3 — Tap handler: covers both background and foreground banner taps
        const unsubTap = listenNotificationTaps(handleNotificationTap);

        // 4 — Killed state: app launched by tapping a notification
        checkInitialNotification().then((data) => {
            if (data) handleNotificationTap(data);
        });

        return () => {
            unsubForeground();
            unsubTap();
        };
    }, []);


    const tabBarHeight = 56 + insets.bottom + 8;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: [styles.tabBar, { height: tabBarHeight, paddingBottom: insets.bottom + 10 }],
                tabBarLabelStyle: styles.tabLabel,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textTertiary,
            }}
        >
            {/* ── Visible tab screens ────────────────────────── */}
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Garages',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? 'map' : 'map-outline'} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="my-bookings"
                options={{
                    title: 'Bookings',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="cart"
                options={{
                    title: 'Cart',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? 'cart' : 'cart-outline'} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="account"
                options={{
                    title: 'Account',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
                    ),
                }}
            />

            {/* ── Hidden screens (no tab bar entry) ─────────── */}
            <Tabs.Screen name="garage-detail" options={{ href: null }} />
            <Tabs.Screen name="book-slot" options={{ href: null }} />
            <Tabs.Screen name="my-vehicles" options={{ href: null }} />
            <Tabs.Screen name="refer-earn" options={{ href: null }} />
            <Tabs.Screen name="checkout" options={{ href: null }} />
            <Tabs.Screen name="about" options={{ href: null }} />
            <Tabs.Screen name="terms-of-service" options={{ href: null }} />
            <Tabs.Screen name="privacy-policy" options={{ href: null }} />
        </Tabs>
    );
}


const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: Colors.surface,
        borderTopColor: Colors.border,
        borderTopWidth: 1,
        paddingTop: 8,
    },
    tabLabel: {
        ...Typography.tab,
        marginTop: 2,
    },
    iconWrap: {
        width: 36,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    iconWrapActive: {
        backgroundColor: Colors.primaryLight,
    },
});
