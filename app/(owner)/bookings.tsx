import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, ActivityIndicator,
    Modal, ScrollView, Pressable,
    TextInput, Animated
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getMyGarage } from '../../utils/services/garageService';
import {
    getGarageBookings, acceptBooking, rejectBooking,
    startBooking, completeBooking, OwnerStatus,
} from '../../utils/services/bookingService';
import { Booking, BookingStatus } from '../../types';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

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

type ActionDef = { action: 'accept' | 'reject' | 'start' | 'complete'; label: string; color: string; icon: any; };

const STATUS_ACTIONS: Partial<Record<BookingStatus, ActionDef[]>> = {
    pending: [
        { action: 'accept', label: 'Accept', color: Colors.success, icon: 'checkmark-circle-outline' },
        { action: 'reject', label: 'Reject', color: Colors.error, icon: 'close-circle-outline' },
    ],
    accepted: [
        { action: 'start', label: 'Start Work', color: Colors.info, icon: 'build-outline' },
        { action: 'reject', label: 'Reject', color: Colors.error, icon: 'close-circle-outline' },
    ],
    in_progress: [
        { action: 'complete', label: 'Mark Done', color: Colors.success, icon: 'checkmark-done-outline' },
    ],
};

const FILTER_TABS = [
    { key: 'all', label: 'All' }, { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' }, { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' }, { key: 'rejected', label: 'Rejected' },
];

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

// Update every setSelected(null) call to also reset

export default function OwnerBookingsScreen() {
    const { toast, showToast, hideToast } = useToast();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [filtered, setFiltered] = useState<Booking[]>([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [selected, setSelected] = useState<Booking | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    // Add alongside other useState declarations
    const slideAnim = useRef(new Animated.Value(0)).current;



    useFocusEffect(useCallback(() => { load(); }, []));

    const load = async () => {
        setLoading(true);
        try {
            const data = await getGarageBookings();
            const safe = Array.isArray(data) ? data : [];
            setBookings(safe);
            applyFilter(activeFilter, safe);
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Failed to load bookings.', 'error');
            setBookings([]); setFiltered([]);
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setSelected(null);
        setRejectNote('');
        setShowRejectInput(false);
    };


    const applyFilter = (key: string, source?: Booking[]) => {
        const list = Array.isArray(source) ? source : bookings;
        setActiveFilter(key);
        setFiltered(key === 'all' ? list : list.filter((b) => b.status === key));
    };

    const handleAction = async (booking: Booking, action: ActionDef['action']) => {
        // If reject — show input first, don't proceed until confirmed
        if (action === 'reject' && !showRejectInput) {
            setShowRejectInput(true);
            return;
        }

        setUpdatingId(booking.id);
        try {
            switch (action) {
                case 'accept': await acceptBooking(booking.id); break;
                case 'reject': await rejectBooking(booking.id, rejectNote); break;  // ← pass note
                case 'start': await startBooking(booking.id); break;
                case 'complete': await completeBooking(booking.id); break;
            }
            showToast(`Booking ${action}ed successfully.`, 'success');
            closeModal();
            load();
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? `Failed to ${action} booking.`, 'error');
        } finally {
            setUpdatingId(null);
        }
    };


    // ── Compact card — customer name, status, date only ───────────────────────
    const renderBooking = ({ item }: { item: Booking }) => {
        const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => setSelected(item)}
                activeOpacity={0.75}
            >
                <View style={styles.cardLeft}>
                    <View style={styles.avatarBox}>
                        <Text style={styles.avatarText}>
                            {item.customer_name?.charAt(0).toUpperCase() ?? '?'}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.customerName} numberOfLines={1}>{item.customer_name}</Text>
                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={12} color={Colors.textTertiary} />
                            <Text style={styles.dateText}>{formatDisplayDate(item.date)}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.cardRight}>
                    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon} size={11} color={cfg.color} />
                        <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={Colors.textTertiary} />
                </View>
            </TouchableOpacity>
        );
    };

    const pendingCount = bookings.filter((b) => b.status === 'pending').length;

    return (
        <View style={styles.container}>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Bookings</Text>
                    <Text style={styles.headerSub}>
                        {bookings.length} total · {pendingCount} pending
                    </Text>
                </View>
                {pendingCount > 0 && (
                    <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>{pendingCount} new</Text>
                    </View>
                )}
            </View>

            {/* ── Filter tabs ─────────────────────────────────────────────────── */}
            <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContent}
            >
                {FILTER_TABS.map((tab) => {
                    const count = tab.key === 'all' ? bookings.length : bookings.filter((b) => b.status === tab.key).length;
                    const active = activeFilter === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.filterTab, active && styles.filterTabActive]}
                            onPress={() => applyFilter(tab.key)}
                        >
                            <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{tab.label}</Text>
                            {count > 0 && (
                                <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                                    <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>{count}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* ── List ───────────────────────────────────────────────────────── */}
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
                            <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>
                                {activeFilter === 'all' ? 'No bookings yet' : `No ${activeFilter.replace('_', ' ')} bookings`}
                            </Text>
                            <Text style={styles.emptyDesc}>Customer bookings will appear here.</Text>
                        </View>
                    )
                }
            />

            {/* ── Detail Modal ───────────────────────────────────────────────── */}
            <Modal
                visible={!!selected}
                transparent
                animationType="fade"
                // onRequestClose={() => setSelected(null)}
                onRequestClose={closeModal}
            >
                {/* <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)} /> */}
                <Pressable style={styles.modalOverlay} onPress={closeModal} />
                {selected && (() => {
                    const cfg = STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.pending;
                    const actions = STATUS_ACTIONS[selected.status] ?? [];
                    return (
                        <View style={styles.modalSheet}>
                            <View style={styles.modalHandle} />

                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Booking Details</Text>
                                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => closeModal()}>
                                    <Ionicons name="close" size={20} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView contentContainerStyle={styles.modalContent}>
                                {/* Status banner */}
                                <View style={[styles.statusBanner, { backgroundColor: cfg.bg }]}>
                                    <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                                    <Text style={[styles.statusBannerText, { color: cfg.color }]}>{cfg.label}</Text>
                                </View>

                                {/* Customer info */}
                                <View style={styles.customerCard}>
                                    <View style={[styles.avatarBox, styles.avatarBoxLg]}>
                                        <Text style={[styles.avatarText, styles.avatarTextLg]}>
                                            {selected.customer_name?.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.customerNameLg}>{selected.customer_name}</Text>
                                        <Text style={styles.customerPhoneText}>{selected.customer_phone}</Text>
                                    </View>
                                </View>

                                {/* Booking details */}
                                <View style={styles.detailCard}>
                                    {[
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

                                {/* Action buttons */}
                                {/* Action buttons + reject note input */}
                                {actions.length > 0 && (
                                    <View style={styles.actionsWrap}>

                                        {showRejectInput ? (
                                            // ── Reject note input ────────────────────────────────
                                            <View style={styles.rejectInputWrap}>
                                                <Text style={styles.rejectInputLabel}>
                                                    Reason for rejection
                                                    <Text style={styles.rejectOptional}> (optional)</Text>
                                                </Text>
                                                <TextInput
                                                    style={styles.rejectInput}
                                                    placeholder="e.g. Fully booked, Part unavailable..."
                                                    placeholderTextColor={Colors.textTertiary}
                                                    value={rejectNote}
                                                    onChangeText={setRejectNote}
                                                    multiline
                                                    numberOfLines={3}
                                                    textAlignVertical="top"
                                                    autoFocus
                                                />
                                                <View style={styles.rejectActions}>
                                                    {/* Cancel reject */}
                                                    <TouchableOpacity
                                                        style={styles.rejectCancelBtn}
                                                        onPress={() => { setShowRejectInput(false); setRejectNote(''); }}
                                                    >
                                                        <Text style={styles.rejectCancelText}>Go Back</Text>
                                                    </TouchableOpacity>

                                                    {/* Confirm reject */}
                                                    <TouchableOpacity
                                                        style={styles.rejectConfirmBtn}
                                                        onPress={() => handleAction(selected, 'reject')}
                                                        disabled={updatingId === selected.id}
                                                    >
                                                        {updatingId === selected.id ? (
                                                            <ActivityIndicator color="#fff" size="small" />
                                                        ) : (
                                                            <>
                                                                <Ionicons name="close-circle-outline" size={16} color="#fff" />
                                                                <Text style={styles.rejectConfirmText}>Confirm Reject</Text>
                                                            </>
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ) : (
                                            // ── Normal action buttons ────────────────────────────
                                            <View style={styles.actionsRow}>
                                                {updatingId === selected.id ? (
                                                    <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.md }} />
                                                ) : (
                                                    actions.map((act) => (
                                                        <TouchableOpacity
                                                            key={act.action}
                                                            style={[styles.actionBtn, { borderColor: act.color, backgroundColor: act.color + '12' }]}
                                                            onPress={() => handleAction(selected, act.action)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Ionicons name={act.icon} size={17} color={act.color} />
                                                            <Text style={[styles.actionBtnText, { color: act.color }]}>{act.label}</Text>
                                                        </TouchableOpacity>
                                                    ))
                                                )}
                                            </View>
                                        )}

                                    </View>
                                )}

                            </ScrollView>
                        </View>
                    );
                })()}
            </Modal>

            <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 56, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    headerTitle: { ...Typography.h1, color: Colors.textPrimary },
    headerSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 4 },
    pendingBadge: { backgroundColor: Colors.warning, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
    pendingBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },

    filterScroll: { backgroundColor: Colors.surface, maxHeight: 52 },
    filterContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.xs, alignItems: 'center' },
    filterTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
    filterTabActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    filterTabText: { ...Typography.overline, color: Colors.textTertiary, fontWeight: '600' },
    filterTabTextActive: { color: Colors.primary },
    filterBadge: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
    filterBadgeActive: { backgroundColor: Colors.primary },
    filterBadgeText: { fontSize: 9, color: Colors.textTertiary, fontWeight: '700' },
    filterBadgeTextActive: { color: '#fff' },

    list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 40 },

    // ── Compact card ──────────────────────────────────────────────────
    card: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
    cardRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    avatarBox: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarBoxLg: { width: 48, height: 48, borderRadius: 24 },
    avatarText: { ...Typography.body, color: '#fff', fontWeight: '700' },
    avatarTextLg: { fontSize: 20 },
    customerName: { ...Typography.h3, color: Colors.textPrimary, maxWidth: 160 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
    dateText: { ...Typography.caption, color: Colors.textTertiary },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: Radius.full },
    statusPillText: { fontSize: 10, fontWeight: '700' },

    // ── Modal ─────────────────────────────────────────────────────────
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    modalSheet: {
        backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingBottom: 40, maxHeight: '88%',
        position: 'absolute', bottom: 0, left: 0, right: 0,
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginTop: Spacing.sm },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    modalTitle: { ...Typography.h2, color: Colors.textPrimary },
    modalCloseBtn: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    modalContent: { padding: Spacing.md, gap: Spacing.sm },

    statusBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg },
    statusBannerText: { ...Typography.h3, fontWeight: '700' },

    customerCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surfaceAlt, padding: Spacing.md, borderRadius: Radius.lg },
    customerNameLg: { ...Typography.h3, color: Colors.textPrimary },
    customerPhoneText: { ...Typography.caption, color: Colors.textTertiary, marginTop: 3 },

    detailCard: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
    detailIconBox: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    detailTextWrap: { flex: 1 },
    detailLabel: { ...Typography.overline, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    detailValue: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600', marginTop: 2 },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.md },

    actionsRow: { flexDirection: 'row', gap: Spacing.sm },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5 },
    actionBtnText: { ...Typography.body, fontWeight: '700' },

    empty: { alignItems: 'center', marginTop: 60, gap: Spacing.sm, paddingHorizontal: Spacing.xl },
    emptyTitle: { ...Typography.h3, color: Colors.textSecondary },
    emptyDesc: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },
    // Add to StyleSheet.create({})
    actionsWrap: { gap: Spacing.sm },

    rejectInputWrap: {
        backgroundColor: '#FEF2F2',
        borderRadius: Radius.lg,
        borderWidth: 1.5, borderColor: '#FECACA',
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    rejectInputLabel: {
        ...Typography.caption, color: Colors.error,
        fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4,
    },
    rejectOptional: {
        color: Colors.textTertiary, fontWeight: '400', textTransform: 'none',
    },
    rejectInput: {
        ...Typography.body, color: Colors.textPrimary,
        backgroundColor: Colors.surface,
        borderRadius: Radius.md, borderWidth: 1, borderColor: '#FECACA',
        padding: Spacing.sm, minHeight: 80,
    },
    rejectActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
    rejectCancelBtn: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingVertical: Spacing.sm, borderRadius: Radius.md,
        borderWidth: 1, borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    rejectCancelText: { ...Typography.body, color: Colors.textSecondary, fontWeight: '600' },
    rejectConfirmBtn: {
        flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.xs, paddingVertical: Spacing.sm,
        borderRadius: Radius.md, backgroundColor: Colors.error,
    },
    rejectConfirmText: { ...Typography.body, color: '#fff', fontWeight: '700' },

});
