import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Typography } from '../../constants/theme';

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

    // Bottom bar height = icon + label + safe area + extra breathing room
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
                name="account"
                options={{
                    title: 'Account',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen name="garage-detail" options={{ href: null }} />
            <Tabs.Screen name="book-slot" options={{ href: null }} />
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
