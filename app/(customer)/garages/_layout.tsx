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
            <Stack.Screen name="book-slots" />
            <Stack.Screen name="garage-detail" />
        </Stack>
    );
}