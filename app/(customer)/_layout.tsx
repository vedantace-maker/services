// app/(customer)/_layout.tsx

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Typography } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useCart } from '../../context/CartContext';   // ✅ added
import {
    // setupPushNotifications,
    listenForegroundNotifications,
    listenNotificationTaps,
    checkInitialNotification,
} from '../../utils/notifications';
import { setupPushNotifications } from '@/utils/services/notificationService';

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

// ── Cart icon with badge ──────────────────────────────────────────────────────
function CartTabIcon({ focused }: { focused: boolean }) {
    const { items } = useCart();           // ✅ adjust if your context uses different shape
    const count = items?.length ?? 0;

    return (
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
            <Ionicons
                name={focused ? 'cart' : 'cart-outline'}
                size={20}
                color={focused ? Colors.primary : Colors.textTertiary}
            />
            {count > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {count > 99 ? '99+' : String(count)}
                    </Text>
                </View>
            )}
        </View>
    );
}

export default function CustomerLayout() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const handleNotificationTap = (data: Record<string, string>) => {
        if (data?.screen === 'bookings') {
            router.push('/(customer)/my-bookings' as any);
        }
    };

    useEffect(() => {
        setupPushNotifications();

        const unsubForeground = listenForegroundNotifications((notification) => {
            console.log('[Layout] Foreground notification:', notification.request.content.data);
        });

        const unsubTap = listenNotificationTaps(handleNotificationTap);

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
                name="garages"
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

            {/* ── Cart tab — with live badge ─────────────────── */}
            <Tabs.Screen
                name="cart"
                options={{
                    title: 'Cart',
                    tabBarIcon: ({ focused }) => (
                        <CartTabIcon focused={focused} />   // ✅ uses CartTabIcon
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
            <Tabs.Screen name="checkout" options={{ href: null }} />
            {/* <Tabs.Screen name="location" options={{ href: null }} /> */}
            {/* <Tabs.Screen name="garage-detail" options={{ href: null }} /> */}
            {/* <Tabs.Screen name="book-slot" options={{ href: null }} /> */}
            {/* <Tabs.Screen name="my-vehicles" options={{ href: null }} /> */}
            {/* <Tabs.Screen name="refer-earn" options={{ href: null }} /> */}
            {/* <Tabs.Screen name="about" options={{ href: null }} /> */}
            {/* <Tabs.Screen name="terms-of-service" options={{ href: null }} /> */}
            {/* <Tabs.Screen name="privacy-policy" options={{ href: null }} /> */}
            {/* <Tabs.Screen name="booking-invoice" options={{ href: null }} /> */}
            {/* <Tabs.Screen name="booking-details" options={{ href: null }} /> */}
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

    // ── Badge ─────────────────────────────────────────────────────────────────
    badge: {
        position: 'absolute',
        top: -4,
        right: -6,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.error,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: Colors.surface,   // matches tab bar background
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#fff',
        lineHeight: 12,
    },
});