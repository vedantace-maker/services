import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from '../../../components/Toast';
import { Colors, Radius, Shadow, Spacing, Typography } from '../../../constants/theme';
import { useToast } from '../../../hooks/useToast';
import { Booking, BookingStatus } from '../../../types';
import { cancelBooking, getMyBookings } from '../../../utils/services/bookingService';

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

const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'accepted', 'in_progress'];
const PAST_STATUSES: BookingStatus[] = ['completed', 'rejected', 'cancelled'];

const FILTER_TABS: Record<'active' | 'past', { key: string; label: string }[]> = {
    active: [
        { key: 'all', label: 'All' },
        { key: 'pending', label: 'Pending' },
        { key: 'accepted', label: 'Accepted' },
        { key: 'in_progress', label: 'In Progress' },
    ],
    past: [
        { key: 'all', label: 'All' },
        { key: 'completed', label: 'Completed' },
        { key: 'rejected', label: 'Rejected' },
        { key: 'cancelled', label: 'Cancelled' },
    ],
};

function formatDisplayTime(time: string): string {
    if (!time) return '';
    const [hStr, mStr] = time.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ?? '00';
    if (h === 0) return `12:${m} AM`;
    if (h < 12) return `${h}:${m} AM`;
    if (h === 12) return `12:${m} PM`;
    return `${h - 12}:${m} PM`;
}

function formatDisplayDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
}

export default function BookingsScreen() {
    const router = useRouter();
    const { toast, showToast, hideToast } = useToast();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [selected, setSelected] = useState<Booking | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
    const [filterKey, setFilterKey] = useState('all');

    const slideAnim = useRef(new Animated.Value(0)).current;

    useFocusEffect(useCallback(() => { load(); }, []));

    const load = async () => {
        setLoading(true);
        try {
            const data = await getMyBookings();
            setBookings(Array.isArray(data) ? data : []);
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Failed to load bookings.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ── Switch main tab — reset filter ────────────────────────────────────────
    const switchTab = (tab: 'active' | 'past') => {
        setActiveTab(tab);
        setFilterKey('all');
    };

    // ── Derive visible list from tab + filter ─────────────────────────────────
    const tabPool = bookings.filter((b) =>
        activeTab === 'active'
            ? ACTIVE_STATUSES.includes(b.status)
            : PAST_STATUSES.includes(b.status)
    );
    const filtered = filterKey === 'all'
        ? tabPool
        : tabPool.filter((b) => b.status === filterKey);

    // ── Add these navigation helpers ───────────────────────────────────────────
    const goToDetails = (booking: Booking) => {
        router.push({
            pathname: '/(customer)/my-bookings/booking-details' as any,
            params: { booking: JSON.stringify(booking) },
        });
    };

    const goToInvoice = (booking: Booking) => {
        router.push({
            pathname: '/(customer)/my-bookings/booking-invoice' as any,
            params: { booking: JSON.stringify(booking) },
        });
    };
    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openModal = (item: Booking) => {
        setSelected(item);
        slideAnim.setValue(0);
        Animated.spring(slideAnim, {
            toValue: 1, useNativeDriver: true, tension: 65, friction: 11,
        }).start();
    };

    const closeModal = () => {
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true })
            .start(() => setSelected(null));
    };

    const handleCancel = async (booking: Booking) => {
        setCancellingId(booking.id);
        try {
            await cancelBooking(booking.id);
            showToast('Booking cancelled.', 'success');
            closeModal();
            load();
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Could not cancel booking.', 'error');
        } finally {
            setCancellingId(null);
        }
    };

    // ── Stats ─────────────────────────────────────────────────────────────────
    const activeCount = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length;
    const completedCount = bookings.filter((b) => b.status === 'completed').length;
    const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;

    // ── Compact card ──────────────────────────────────────────────────────────
    const renderBooking = ({ item }: { item: Booking }) => {
        const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
        return (
            <View style={styles.card}>
                {/* Left colored status bar */}
                <View style={[styles.cardBar, { backgroundColor: cfg.color }]} />

                <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                        <View style={styles.garageIconBox}>
                            <Ionicons name="storefront-outline" size={16} color={Colors.primary} />
                        </View>
                        <Text style={styles.garageName} numberOfLines={1}>{item.garage_name}</Text>
                        <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                            <Ionicons name={cfg.icon} size={10} color={cfg.color} />
                            <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                    </View>

                    <Text style={styles.serviceText} numberOfLines={1}>
                        {item.selected_services}
                    </Text>

                    <View style={styles.cardMeta}>
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={12} color={Colors.textTertiary} />
                            <Text style={styles.metaText}>{formatDisplayDate(item.date)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
                            <Text style={styles.metaText}>{formatDisplayTime(item.time)}</Text>
                        </View>
                    </View>

                    {/* ── Action Buttons ─────────────────────────────────────── */}
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={styles.detailsBtn}
                            onPress={() => goToDetails(item)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="document-text-outline" size={13} color={Colors.primary} />
                            <Text style={styles.detailsBtnText}>Details</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.invoiceBtn}
                            onPress={() => goToInvoice(item)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="receipt-outline" size={13} color={Colors.textSecondary} />
                            <Text style={styles.invoiceBtnText}>Invoice</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <Text style={styles.headerSub}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''} total</Text>
            </View>

            {/* ── Stats row ───────────────────────────────────────────────────── */}
            <View style={styles.statsRow}>
                {[
                    { label: 'Active', count: activeCount, color: Colors.primary },
                    { label: 'Completed', count: completedCount, color: Colors.success },
                    { label: 'Cancelled', count: cancelledCount, color: Colors.error },
                ].map((s) => (
                    <View key={s.label} style={styles.statBox}>
                        <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {/* ── Active / Past toggle ─────────────────────────────────────────── */}
            <View style={styles.tabRow}>
                {(['active', 'past'] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => switchTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab === 'active'
                                ? `Active (${activeCount})`
                                : `History (${bookings.length - activeCount})`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Status filter chips ──────────────────────────────────────────── */}
            <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContent}
            >
                {FILTER_TABS[activeTab].map((tab) => {
                    const count = tab.key === 'all'
                        ? tabPool.length
                        : tabPool.filter((b) => b.status === tab.key).length;
                    const active = filterKey === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.filterTab, active && styles.filterTabActive]}
                            onPress={() => setFilterKey(tab.key)}
                        >
                            <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                                {tab.label}
                            </Text>
                            {count > 0 && (
                                <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                                    <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                                        {count}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* ── List ────────────────────────────────────────────────────────── */}
            <FlatList
                data={filtered}
                keyExtractor={(b) => String(b.id)}
                renderItem={renderBooking}
                contentContainerStyle={styles.list}
                onRefresh={load}
                refreshing={loading}
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
                    ) : (
                        <View style={styles.empty}>
                            <Ionicons
                                name={activeTab === 'active' ? 'calendar-outline' : 'receipt-outline'}
                                size={48}
                                color={Colors.textTertiary}
                            />
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'active' ? 'No active bookings' : 'No booking history'}
                            </Text>
                            <Text style={styles.emptyDesc}>
                                {activeTab === 'active'
                                    ? 'Your ongoing bookings will appear here.'
                                    : 'Completed and past bookings will appear here.'}
                            </Text>
                            {activeTab === 'active' && (
                                <TouchableOpacity
                                    style={styles.browseBtn}
                                    onPress={() => router.replace('/(customer)/' as any)}
                                >
                                    <Text style={styles.browseBtnText}>Browse Garages</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )
                }
            />

            {/* ── Detail Modal ─────────────────────────────────────────────────── */}
            <Modal
                visible={!!selected}
                transparent
                animationType="fade"
                onRequestClose={closeModal}
            >
                <Pressable style={styles.modalOverlay} onPress={closeModal} />

                {selected && (
                    <Animated.View style={[styles.modalSheet, {
                        transform: [{
                            translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }),
                        }],
                    }]}>
                        {(() => {
                            const cfg = STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.pending;
                            const cancellable = selected.status === 'pending' || selected.status === 'accepted';
                            return (
                                <>
                                    <View style={styles.modalHandle} />

                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>Booking Details</Text>
                                        <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal}>
                                            <Ionicons name="close" size={20} color={Colors.textPrimary} />
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView contentContainerStyle={styles.modalContent}>
                                        {/* Status banner */}
                                        <View style={[styles.statusBanner, { backgroundColor: cfg.bg }]}>
                                            <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                                            <Text style={[styles.statusBannerText, { color: cfg.color }]}>
                                                {cfg.label}
                                            </Text>
                                        </View>

                                        {/* Details */}
                                        <View style={styles.detailCard}>
                                            {[
                                                { icon: 'storefront-outline', label: 'Garage', value: selected.garage_name },
                                                { icon: 'location-outline', label: 'Address', value: selected.garage_address },
                                                { icon: 'call-outline', label: 'Phone', value: selected.garage_phone },
                                                { icon: 'construct-outline', label: 'Services', value: selected.selected_services },
                                                {
                                                    icon: selected.vehicle_type === 'bike' ? 'bicycle-outline' : 'speedometer-outline',
                                                    label: 'Vehicle',
                                                    value: `${selected.vehicle_type === 'bike' ? 'Bike' : 'Scooty'} — ${selected.bike_details}`,
                                                },
                                                { icon: 'calendar-outline', label: 'Date', value: formatDisplayDate(selected.date) },
                                                { icon: 'time-outline', label: 'Time', value: formatDisplayTime(selected.time) },
                                            ].map((row, i, arr) => (
                                                <View key={row.label}>
                                                    <View style={styles.detailRow}>
                                                        <View style={styles.detailIconBox}>
                                                            <Ionicons name={row.icon as any} size={15} color={Colors.primary} />
                                                        </View>
                                                        <View style={styles.detailTextWrap}>
                                                            <Text style={styles.detailLabel}>{row.label}</Text>
                                                            <Text style={styles.detailValue}>{row.value}</Text>
                                                        </View>
                                                    </View>
                                                    {i < arr.length - 1 && <View style={styles.divider} />}
                                                </View>
                                            ))}
                                        </View>

                                        {/* Reject note */}
                                        {selected.status === 'rejected' && (
                                            <View style={styles.rejectNoteCard}>
                                                <View style={styles.rejectNoteHeader}>
                                                    <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
                                                    <Text style={styles.rejectNoteTitle}>Reason for Rejection</Text>
                                                </View>
                                                <Text style={styles.rejectNoteText}>
                                                    {selected.rejection_note?.trim()
                                                        ? selected.rejection_note
                                                        : 'No reason provided by the garage.'}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Cancel button */}
                                        {cancellable && (
                                            <TouchableOpacity
                                                style={styles.cancelBtn}
                                                onPress={() => handleCancel(selected)}
                                                disabled={cancellingId === selected.id}
                                                activeOpacity={0.85}
                                            >
                                                {cancellingId === selected.id ? (
                                                    <ActivityIndicator color={Colors.error} />
                                                ) : (
                                                    <>
                                                        <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                                                        <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </ScrollView>
                                </>
                            );
                        })()}
                    </Animated.View>
                )}
            </Modal>

            <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
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
    headerTitle: { ...Typography.h1, color: Colors.textPrimary },
    headerSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 4 },

    // Stats
    statsRow: {
        flexDirection: 'row', backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, gap: 2 },
    statCount: { ...Typography.h2, fontWeight: '800' },
    statLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' },

    // Active / Past tab
    tabRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm },
    tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
    tabText: { ...Typography.body, color: Colors.textTertiary, fontWeight: '600' },
    tabTextActive: { color: Colors.primary },

    // Status filter chips
    filterScroll: { backgroundColor: Colors.surface, maxHeight: 48, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    filterContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, gap: Spacing.xs, alignItems: 'center' },
    filterTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
    filterTabActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    filterTabText: { ...Typography.overline, color: Colors.textTertiary, fontWeight: '600' },
    filterTabTextActive: { color: Colors.primary },
    filterBadge: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
    filterBadgeActive: { backgroundColor: Colors.primary },
    filterBadgeText: { fontSize: 9, color: Colors.textTertiary, fontWeight: '700' },
    filterBadgeTextActive: { color: '#fff' },

    list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 40 },

    // Card
    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm,
    },
    cardBar: { width: 4, alignSelf: 'stretch' },
    cardBody: { flex: 1, padding: Spacing.md, gap: 5 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    garageIconBox: { width: 26, height: 26, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    garageName: { ...Typography.h3, color: Colors.textPrimary, flex: 1 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: Spacing.xs, paddingVertical: 3, borderRadius: Radius.full },
    statusPillText: { fontSize: 9, fontWeight: '700' },
    serviceText: { ...Typography.caption, color: Colors.textSecondary },
    cardMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: 2 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { ...Typography.caption, color: Colors.textTertiary },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '85%', position: 'absolute', bottom: 0, left: 0, right: 0 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginTop: Spacing.sm },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    modalTitle: { ...Typography.h2, color: Colors.textPrimary },
    modalCloseBtn: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    modalContent: { padding: Spacing.md, gap: Spacing.sm },

    statusBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg },
    statusBannerText: { ...Typography.h3, fontWeight: '700' },

    detailCard: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
    detailIconBox: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    detailTextWrap: { flex: 1 },
    detailLabel: { ...Typography.overline, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    detailValue: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600', marginTop: 2 },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.md },

    cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
    cancelBtnText: { ...Typography.body, color: Colors.error, fontWeight: '700' },

    rejectNoteCard: { backgroundColor: '#FEF2F2', borderRadius: Radius.lg, borderWidth: 1, borderColor: '#FECACA', padding: Spacing.md, gap: Spacing.sm },
    rejectNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    rejectNoteTitle: { ...Typography.caption, color: Colors.error, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    rejectNoteText: { ...Typography.body, color: '#7F1D1D', fontStyle: 'italic', lineHeight: 22 },

    empty: { alignItems: 'center', marginTop: 60, gap: Spacing.sm, paddingHorizontal: Spacing.xl },
    emptyTitle: { ...Typography.h3, color: Colors.textSecondary },
    emptyDesc: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },
    browseBtn: { marginTop: Spacing.sm, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    browseBtnText: { ...Typography.body, color: '#fff', fontWeight: '700' },

    // Add to StyleSheet.create({...})
    cardActions: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginTop: Spacing.xs,
        paddingTop: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    detailsBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 4,
        paddingVertical: 7, borderRadius: Radius.md,
        backgroundColor: Colors.primaryLight,
        borderWidth: 1, borderColor: Colors.primary + '33',
    },
    detailsBtnText: {
        fontSize: 12, fontWeight: '700', color: Colors.primary,
    },
    invoiceBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 4,
        paddingVertical: 7, borderRadius: Radius.md,
        backgroundColor: Colors.surfaceAlt,
        borderWidth: 1, borderColor: Colors.border,
    },
    invoiceBtnText: {
        fontSize: 12, fontWeight: '700', color: Colors.textSecondary,
    },
});
