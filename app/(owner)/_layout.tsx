import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function OwnerLayout() {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: '#FF6B35' }}>
            <Tabs.Screen
                name="index"
                options={{ title: 'Dashboard', tabBarIcon: () => <Text>🏪</Text> }}
            />
            <Tabs.Screen
                name="schedule"
                options={{ title: 'Schedule', tabBarIcon: () => <Text>🗓️</Text> }}
            />
            <Tabs.Screen
                name="bookings"
                options={{ title: 'Bookings', tabBarIcon: () => <Text>📋</Text> }}
            />
            <Tabs.Screen
                name="account"
                options={{ title: 'Account', tabBarIcon: () => <Text>👤</Text> }}
            />
        </Tabs>
    );
}
