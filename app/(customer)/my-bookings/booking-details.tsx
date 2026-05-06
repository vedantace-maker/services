import React from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Booking, BookingStatus } from '../../../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

const STATUS_CONFIG: Record<BookingStatus, {
    label: string; color: string; bg: string; icon: any;
}> = {
    pending: { label: 'Pending', color: '#92400E', bg: '#FFFBEB', icon: 'time-outline' },
    accepted: { label: 'Accepted', color: '#065F46', bg: '#ECFDF5', icon: 'checkmark-circle-outline' },
    rejected: { label: 'Rejected', color: '#991B1B', bg: '#FEF2F2', icon: 'close-circle-outline' },
    in_progress: { label: 'In Progress', color: '#1E40AF', bg: '#EFF6FF', icon: 'build-outline' },
    completed: { label: 'Completed', color: '#14532D', bg: '#F0FDF4', icon: 'checkmark-done-outline' },
    cancelled: { label: 'Cancelled', color: '#374151', bg: '#F3F4F6', icon: 'ban-outline' },
};

function formatDisplayTime(time: string): string {
    if (!time) return '—';
    const [hStr, mStr] = time.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ?? '00';
    if (h === 0) return `12:${m} AM`;
    if (h < 12) return `${h}:${m} AM`;
    if (h === 12) return `12:${m} PM`;
    return `${h - 12}:${m} PM`;
}

function formatDisplayDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={s.section}>
            <Text style={s.sectionTitle}>{title}</Text>
            <View style={s.sectionCard}>{children}</View>
        </View>
    );
}

function DetailRow({
    icon, label, value, last = false,
}: {
    icon: string; label: string; value: string; last?: boolean;
}) {
    return (
        <>
            <View style={s.detailRow}>
                <View style={s.iconBox}>
                    <Ionicons name={icon as any} size={16} color={Colors.primary} />
                </View>
                <View style={s.detailText}>
                    <Text style={s.detailLabel}>{label}</Text>
                    <Text style={s.detailValue}>{value || '—'}</Text>
                </View>
            </View>
            {!last && <View style={s.divider} />}
        </>
    );
}

export default function BookingDetailsScreen() {
    const router = useRouter();
    const { booking: raw } = useLocalSearchParams<{ booking: string }>();
    const booking: Booking = JSON.parse(raw ?? '{}');
    const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
    const cancellable = booking.status === 'pending' || booking.status === 'accepted';

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

            <View style={s.container}>
                {/* ── Header ─────────────────────────────────────────────── */}
                <View style={s.header}>
                    {/* <TouchableOpacity style={s.backBtn} onPress={() => router.push("/(customer)/my-bookings")}> */}
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/(customer)/my-bookings');
                            }
                        }}
                    >
                        <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <View>
                        <Text style={s.headerTitle}>Booking Details</Text>
                        <Text style={s.headerSub}>#{booking.id}</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                    {/* ── Status Banner ───────────────────────────────────── */}
                    <View style={[s.statusBanner, { backgroundColor: cfg.bg }]}>
                        <View style={[s.statusIconCircle, { backgroundColor: cfg.color + '20' }]}>
                            <Ionicons name={cfg.icon} size={28} color={cfg.color} />
                        </View>
                        <View>
                            <Text style={s.statusBannerLabel}>Status</Text>
                            <Text style={[s.statusBannerValue, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                        <View style={[s.statusDot, { backgroundColor: cfg.color }]} />
                    </View>

                    {/* ── Garage Info ─────────────────────────────────────── */}
                    <Section title="🏪  Garage Information">
                        <DetailRow icon="storefront-outline" label="Garage Name" value={booking.garage_name} />
                        <DetailRow icon="location-outline" label="Address" value={booking.garage_address} />
                        <DetailRow icon="call-outline" label="Phone" value={booking.garage_phone} last />
                    </Section>

                    {/* ── Vehicle Info ─────────────────────────────────────── */}
                    <Section title="🏍️  Vehicle Information">
                        <DetailRow
                            icon={booking.vehicle_type === 'bike' ? 'bicycle-outline' : 'speedometer-outline'}
                            label="Vehicle Type"
                            value={booking.vehicle_type === 'bike' ? 'Bike' : 'Scooty'}
                        />
                        <DetailRow
                            icon="information-circle-outline"
                            label="Details"
                            value={booking.bike_details}
                            last
                        />
                    </Section>

                    {/* ── Services ────────────────────────────────────────── */}
                    <Section title="🔧  Services Booked">
                        {booking.selected_services
                            ?.split(',')
                            .map((svc: string, i: number, arr: string[]) => (
                                <DetailRow
                                    key={i}
                                    icon="construct-outline"
                                    label={`Service ${i + 1}`}
                                    value={svc.trim()}
                                    last={i === arr.length - 1}
                                />
                            ))}
                    </Section>

                    {/* ── Schedule ─────────────────────────────────────────── */}
                    <Section title="📅  Schedule">
                        <DetailRow icon="calendar-outline" label="Date" value={formatDisplayDate(booking.date)} />
                        <DetailRow icon="time-outline" label="Time" value={formatDisplayTime(booking.time)} last />
                    </Section>

                    {/* ── Rejection Note ───────────────────────────────────── */}
                    {booking.status === 'rejected' && (
                        <View style={s.rejectCard}>
                            <View style={s.rejectHeader}>
                                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                                <Text style={s.rejectTitle}>Reason for Rejection</Text>
                            </View>
                            <Text style={s.rejectNote}>
                                {booking.rejection_note?.trim() || 'No reason was provided by the garage.'}
                            </Text>
                        </View>
                    )}

                    {/* ── Actions ──────────────────────────────────────────── */}
                    <View style={s.actions}>
                        <TouchableOpacity
                            style={s.invoiceActionBtn}
                            onPress={() =>
                                router.push({
                                    pathname: '/(customer)/my-bookings/booking-invoice' as any,
                                    params: { booking: raw },
                                })
                            }
                        >
                            <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
                            <Text style={s.invoiceActionText}>View Invoice</Text>
                        </TouchableOpacity>

                        {cancellable && (
                            <TouchableOpacity style={s.cancelBtn}>
                                <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                                <Text style={s.cancelBtnText}>Cancel Booking</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 52, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: Radius.md,
        backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary, textAlign: 'center' },
    headerSub: { ...Typography.caption, color: Colors.textTertiary, textAlign: 'center' },

    scroll: { padding: Spacing.md, gap: Spacing.md },

    statusBanner: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        padding: Spacing.md, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: 'transparent',
        position: 'relative', overflow: 'hidden',
    },
    statusIconCircle: {
        width: 52, height: 52, borderRadius: 26,
        alignItems: 'center', justifyContent: 'center',
    },
    statusBannerLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    statusBannerValue: { fontSize: 20, fontWeight: '800', marginTop: 2 },
    statusDot: {
        position: 'absolute', right: Spacing.md, width: 10, height: 10,
        borderRadius: 5,
    },

    section: { gap: Spacing.xs },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 4 },
    sectionCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.md },
    iconBox: { width: 34, height: 34, borderRadius: Radius.md, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    detailText: { flex: 1 },
    detailLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600', marginTop: 2 },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.md },

    rejectCard: { backgroundColor: '#FEF2F2', borderRadius: Radius.lg, borderWidth: 1, borderColor: '#FECACA', padding: Spacing.md, gap: Spacing.sm },
    rejectHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    rejectTitle: { fontSize: 12, color: Colors.error, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    rejectNote: { ...Typography.body, color: '#7F1D1D', fontStyle: 'italic', lineHeight: 22 },

    actions: { gap: Spacing.sm, marginTop: Spacing.xs },
    invoiceActionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
        padding: Spacing.md, borderRadius: Radius.lg,
        backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary + '44',
    },
    invoiceActionText: { ...Typography.body, color: Colors.primary, fontWeight: '700' },
    cancelBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
        padding: Spacing.md, borderRadius: Radius.lg,
        backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    },
    cancelBtnText: { ...Typography.body, color: Colors.error, fontWeight: '700' },
});