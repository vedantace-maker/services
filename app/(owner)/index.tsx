import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { getMyGarage } from '../../utils/services/garageService';
import { getBookingsByGarage } from '../../utils/storage';   // bookings still local until next step
import { Garage, Booking } from '../../types';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

export default function OwnerDashboard() {
    const user = useAuthStore((s) => s.user);
    const { toast, showToast, hideToast } = useToast();

    const [garage, setGarage] = useState<Garage | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(useCallback(() => { load(); }, []));

    const load = async () => {
        setLoading(true);
        try {
            const g = await getMyGarage();
            const b = await getBookingsByGarage(g.id);
            setGarage(g);
            setBookings(b);
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Failed to load dashboard.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />;

    const pending = bookings.filter((b) => b.status === 'pending').length;
    const inProgress = bookings.filter((b) => b.status === 'in_progress').length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const totalSvc = (garage?.services?.bike?.length ?? 0) + (garage?.services?.scooty?.length ?? 0);
    const isProfileComplete = !!garage?.name?.trim() && !!garage?.address?.trim() && !!garage?.phone?.trim();

    const STATS = [
        { label: 'Pending', value: pending, icon: 'time-outline' as const, color: Colors.warning, bg: Colors.warningLight },
        { label: 'In Service', value: inProgress, icon: 'build-outline' as const, color: Colors.info, bg: Colors.infoLight },
        { label: 'Completed', value: completed, icon: 'checkmark-done-outline' as const, color: Colors.success, bg: Colors.successLight },
        { label: 'Services', value: totalSvc, icon: 'construct-outline' as const, color: Colors.primary, bg: Colors.primaryLight },
    ];

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greetSub}>Dashboard</Text>
                        <Text style={styles.greetName}>{garage?.name}</Text>
                    </View>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
                    </View>
                </View>

                {/* Profile incomplete strip */}
                {!isProfileComplete && (
                    <View style={styles.statusStrip}>
                        <View style={styles.statusLeft}>
                            <View style={[styles.statusDot, { backgroundColor: Colors.warning }]} />
                            <Text style={styles.statusText}>Complete your garage profile in Account</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                    </View>
                )}

                {/* Stats */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Overview</Text>
                    <View style={styles.statsGrid}>
                        {STATS.map((s) => (
                            <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
                                <View style={[styles.statIconBox, { backgroundColor: s.color + '20' }]}>
                                    <Ionicons name={s.icon} size={18} color={s.color} />
                                </View>
                                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                                <Text style={styles.statLabel}>{s.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Recent bookings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Requests</Text>
                    {bookings.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Ionicons name="calendar-outline" size={36} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>No bookings yet</Text>
                            <Text style={styles.emptyDesc}>Customer requests will appear here.</Text>
                        </View>
                    ) : (
                        bookings.slice(0, 5).map((b) => (
                            <View key={b.id} style={styles.bookingRow}>
                                <View style={styles.bookingLeft}>
                                    <View style={styles.bookingIconBox}>
                                        <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
                                    </View>
                                    <View>
                                        <Text style={styles.bookingName}>{b.customerName}</Text>
                                        <Text style={styles.bookingMeta}>{b.date} · {b.time}</Text>
                                    </View>
                                </View>
                                <View style={[styles.statusPill, getStatusBg(b.status)]}>
                                    <Text style={[styles.statusPillText, getStatusColor(b.status)]}>
                                        {b.status.replace('_', ' ')}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Garage info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Garage Info</Text>
                    <View style={styles.infoCard}>
                        {[
                            { icon: 'location-outline' as const, label: 'Address', value: garage?.address || 'Not set' },
                            { icon: 'call-outline' as const, label: 'Phone', value: garage?.phone || 'Not set' },
                        ].map((item, i, arr) => (
                            <View key={item.label}>
                                <View style={styles.infoRow}>
                                    <View style={styles.infoIconBox}>
                                        <Ionicons name={item.icon} size={15} color={Colors.textSecondary} />
                                    </View>
                                    <View>
                                        <Text style={styles.infoLabel}>{item.label}</Text>
                                        <Text style={styles.infoValue}>{item.value}</Text>
                                    </View>
                                </View>
                                {i < arr.length - 1 && <View style={styles.divider} />}
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>

            <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
        </View>
    );
}

function getStatusBg(s: string) {
    const m: Record<string, object> = {
        pending: { backgroundColor: Colors.warningLight }, accepted: { backgroundColor: Colors.successLight },
        rejected: { backgroundColor: Colors.errorLight }, in_progress: { backgroundColor: Colors.infoLight },
        completed: { backgroundColor: '#F0FDF4' }, cancelled: { backgroundColor: Colors.surfaceAlt },
    };
    return m[s] ?? m.pending;
}
function getStatusColor(s: string) {
    const m: Record<string, object> = {
        pending: { color: '#92400E' }, accepted: { color: '#065F46' },
        rejected: { color: '#991B1B' }, in_progress: { color: '#1E40AF' },
        completed: { color: '#14532D' }, cancelled: { color: '#374151' },
    };
    return m[s] ?? m.pending;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { paddingBottom: 32 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 56, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    greetSub: { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
    greetName: { ...Typography.h1, color: Colors.textPrimary, marginTop: 2 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { ...Typography.h3, color: '#fff', fontWeight: '700' },
    statusStrip: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
        marginBottom: Spacing.xs,
    },
    statusLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { ...Typography.caption, color: Colors.textSecondary },
    section: { backgroundColor: Colors.surface, padding: Spacing.md, marginBottom: Spacing.xs },
    sectionTitle: { ...Typography.h2, color: Colors.textPrimary, marginBottom: Spacing.md },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    statCard: { width: '47.5%', borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.xs },
    statIconBox: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statValue: { fontSize: 26, fontWeight: '700' },
    statLabel: { ...Typography.caption, color: Colors.textSecondary },
    emptyCard: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
    emptyTitle: { ...Typography.h3, color: Colors.textSecondary },
    emptyDesc: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },
    bookingRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    bookingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    bookingIconBox: { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    bookingName: { ...Typography.body, color: Colors.textPrimary, fontWeight: '500' },
    bookingMeta: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
    statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
    statusPillText: { ...Typography.overline, fontWeight: '600', textTransform: 'capitalize' },
    infoCard: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
    infoIconBox: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    infoLabel: { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    infoValue: { ...Typography.body, color: Colors.textPrimary, marginTop: 2 },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.md },
});
