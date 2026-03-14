import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function CustomerLayout() {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: '#FF6B35' }}>
            <Tabs.Screen
                name="home"
                options={{ title: 'Home', tabBarIcon: () => <Text>🏠</Text> }}
            />
            <Tabs.Screen
                name="index"
                options={{ title: 'Garages', tabBarIcon: () => <Text>🗺️</Text> }}
            />
            <Tabs.Screen
                name="my-bookings"
                options={{ title: 'My Bookings', tabBarIcon: () => <Text>📋</Text> }}
            />
            <Tabs.Screen
                name="account"
                options={{ title: 'Account', tabBarIcon: () => <Text>👤</Text> }}
            />
            <Tabs.Screen name="garage-detail" options={{ href: null, title: 'Garage Details' }} />
            <Tabs.Screen name="book-slot" options={{ href: null, title: 'Book a Slot' }} />
        </Tabs>
    );
}
