import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getBookingsByCustomer } from '../../utils/storage';
import { useAuthStore } from '../../store/authStore';
import { Booking, BookingStatus } from '../../types';

const STATUS_CONFIG: Record<BookingStatus, { bg: string; text: string; label: string; icon: string }> = {
    pending: { bg: '#FEF9C3', text: '#854D0E', label: 'Pending Approval', icon: '⏳' },
    accepted: { bg: '#DCFCE7', text: '#166534', label: 'Accepted', icon: '✅' },
    rejected: { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected', icon: '❌' },
    in_progress: { bg: '#DBEAFE', text: '#1E40AF', label: 'In Service', icon: '🔧' },
    completed: { bg: '#F0FDF4', text: '#15803D', label: 'Completed', icon: '🎉' },
    cancelled: { bg: '#F4F4F5', text: '#71717A', label: 'Cancelled', icon: '🚫' },
};

export default function MyBookingsScreen() {
    const user = useAuthStore((s) => s.user);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const load = async () => {
                setLoading(true);
                const data = await getBookingsByCustomer(user!.uid);
                setBookings(data);
                setLoading(false);
            };
            load();
        }, [])
    );

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#FF6B35" />;

    return (
        <View style={styles.container}>
            <FlatList
                data={bookings}
                keyExtractor={(b) => b.id}
                renderItem={({ item }) => {
                    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
                    return (
                        <View style={styles.card}>
                            <View style={styles.cardTop}>
                                <Text style={styles.garage}>{item.garageName}</Text>
                                <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                                    <Text style={[styles.badgeText, { color: cfg.text }]}>
                                        {cfg.icon} {cfg.label}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.info}>📅 {item.date}   🕐 {item.time}</Text>
                            <Text style={styles.bike}>🛵 {item.bikeDetails}</Text>

                            {item.status === 'in_progress' && item.estimatedDurationMin != null ? (
                                <Text style={styles.estimate}>
                                    ⏱️ Estimated time: {item.estimatedDurationMin} min
                                </Text>
                            ) : null}

                            {item.status === 'completed' && item.completedAt != null ? (
                                <Text style={styles.completedAt}>
                                    ✅ Completed at {new Date(item.completedAt).toLocaleTimeString()}
                                </Text>
                            ) : null}

                            {item.status === 'rejected' && item.rejectionNote ? (
                                <Text style={styles.rejectionNote}>
                                    📝 Note: {item.rejectionNote}
                                </Text>
                            ) : null}
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No bookings yet.</Text>
                        <Text style={styles.emptyHint}>Find a nearby garage and book a slot!</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9', padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    garage: { fontSize: 16, fontWeight: 'bold', color: '#222', flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    info: { color: '#555', marginTop: 2 },
    bike: { color: '#888', marginTop: 4, fontSize: 13 },
    estimate: { color: '#1E40AF', fontSize: 13, marginTop: 6 },
    completedAt: { color: '#15803D', fontSize: 13, marginTop: 6 },
    rejectionNote: { color: '#991B1B', fontSize: 13, marginTop: 6 },
    emptyBox: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#888', fontSize: 16 },
    emptyHint: { color: '#bbb', fontSize: 13, marginTop: 6 },
});
