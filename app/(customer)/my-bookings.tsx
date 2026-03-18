import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBookingsByCustomer } from '../../utils/storage';
import { useAuthStore } from '../../store/authStore';
import { Booking, BookingStatus } from '../../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

const STATUS_CONFIG: Record<BookingStatus, {
    bg: string; text: string; label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
}> = {
    pending: { bg: Colors.warningLight, text: '#92400E', label: 'Pending Approval', icon: 'time-outline' },
    accepted: { bg: Colors.successLight, text: '#065F46', label: 'Confirmed', icon: 'checkmark-circle-outline' },
    rejected: { bg: Colors.errorLight, text: '#991B1B', label: 'Declined', icon: 'close-circle-outline' },
    in_progress: { bg: Colors.infoLight, text: '#1E40AF', label: 'In Service', icon: 'build-outline' },
    completed: { bg: '#F0FDF4', text: '#14532D', label: 'Completed', icon: 'checkmark-done-outline' },
    cancelled: { bg: Colors.surfaceAlt, text: '#374151', label: 'Cancelled', icon: 'ban-outline' },
};

export default function MyBookingsScreen() {
    const user = useAuthStore((s) => s.user);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        getBookingsByCustomer(user!.uid).then((d) => { setBookings(d); setLoading(false); });
    }, []));

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Bookings</Text>
                <Text style={styles.subtitle}>{bookings.length} total booking{bookings.length !== 1 ? 's' : ''}</Text>
            </View>

            <FlatList
                data={bookings}
                keyExtractor={(b) => b.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
                    return (
                        <View style={styles.card}>
                            {/* Card header */}
                            <View style={styles.cardHeader}>
                                <Text style={styles.garageName}>{item.garageName}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                                    <Ionicons name={cfg.icon} size={12} color={cfg.text} />
                                    <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                                </View>
                            </View>

                            <View style={[styles.divider, { marginBottom: Spacing.sm }]} />

                            {/* Details */}
                            <View style={styles.detailsRow}>
                                <View style={styles.detailItem}>
                                    <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
                                    <Text style={styles.detailText}>{item.date}</Text>
                                </View>
                                <View style={styles.detailDot} />
                                <View style={styles.detailItem}>
                                    <Ionicons name="time-outline" size={14} color={Colors.textTertiary} />
                                    <Text style={styles.detailText}>{item.time}</Text>
                                </View>
                            </View>

                            {/* {item.bikeDetails ? (
                                <View style={[styles.detailItem, { marginTop: Spacing.xs }]}>
                                    <Ionicons name="bicycle-outline" size={14} color={Colors.textTertiary} />
                                    <Text style={styles.detailText}>{item.bikeDetails}</Text>
                                </View>
                            ) : null} */}
                            {/* Bike details row — now its own full-width row, same padding as above */}
                            {item.bikeDetails ? (
                                <View style={styles.bikeRow}>
                                    <Ionicons name="bicycle-outline" size={14} color={Colors.textTertiary} />
                                    <Text style={styles.detailText}>{item.bikeDetails}</Text>
                                </View>
                            ) : null}

                            {item.status === 'in_progress' && item.estimatedDurationMin != null ? (
                                <View style={styles.infoStrip}>
                                    <Ionicons name="timer-outline" size={14} color={Colors.info} />
                                    <Text style={styles.infoStripText}>Estimated: {item.estimatedDurationMin} min</Text>
                                </View>
                            ) : null}

                            {item.status === 'completed' && item.completedAt != null ? (
                                <View style={[styles.infoStrip, { backgroundColor: Colors.successLight }]}>
                                    <Ionicons name="checkmark-done-outline" size={14} color={Colors.success} />
                                    <Text style={[styles.infoStripText, { color: Colors.success }]}>
                                        Completed at {new Date(item.completedAt).toLocaleTimeString()}
                                    </Text>
                                </View>
                            ) : null}

                            {item.status === 'rejected' && item.rejectionNote ? (
                                <View style={[styles.infoStrip, { backgroundColor: Colors.errorLight }]}>
                                    <Ionicons name="information-circle-outline" size={14} color={Colors.error} />
                                    <Text style={[styles.infoStripText, { color: Colors.error }]}>
                                        Note: {item.rejectionNote}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
                        <Text style={styles.emptyTitle}>No bookings yet</Text>
                        <Text style={styles.emptyDesc}>Find a garage and book your first service.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: {
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 56, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    title: { ...Typography.h1, color: Colors.textPrimary },
    subtitle: { ...Typography.caption, color: Colors.textTertiary, marginTop: 4 },
    list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },

    card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.md },
    garageName: { ...Typography.h3, color: Colors.textPrimary, flex: 1, marginRight: Spacing.sm },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
    statusText: { ...Typography.overline, fontWeight: '600' },

    divider: { height: 1, backgroundColor: Colors.borderLight },
    // detailsRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, paddingBottom: Spacing.sm },
    detailsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md },   // ← was padding: Spacing.md paddingTop: Spacing.md, paddingBottom: Spacing.xs,       // ← reduced so bikeRow sits close below
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    detailText: { ...Typography.body, color: Colors.textSecondary },
    detailDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.border, marginHorizontal: Spacing.sm },

    infoStrip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.infoLight, padding: Spacing.sm, marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: Radius.sm, },
    infoStripText: { ...Typography.caption, color: Colors.info, fontWeight: '500' },

    empty: { alignItems: 'center', marginTop: 60, gap: Spacing.sm },
    emptyTitle: { ...Typography.h3, color: Colors.textSecondary },
    emptyDesc: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },
    bikeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, marginVertical: Spacing.sm },  // ← matches detailsRow exactly paddingBottom: Spacing.md,

});
