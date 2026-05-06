// app/(customer)/my-bookings/_layout.tsx

import { Stack } from 'expo-router';

export default function MyBookingsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false, // you are using custom headers
                animation: 'slide_from_right', // smooth native feel
            }}
        >
            {/* Main Bookings Screen (tab entry point) */}
            <Stack.Screen name="index" />
            <Stack.Screen name="refer-earn" />
            <Stack.Screen name="privacy-policy" />
            <Stack.Screen name="terms-of-service" />
            <Stack.Screen name="my-vehicles" />
            <Stack.Screen name="about" />
            <Stack.Screen name="location" />
        </Stack>
    );
}