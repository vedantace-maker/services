import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { getOrCreateGarage, getBookingsByGarage, updateBookingFields } from '../../utils/storage';
import { Booking } from '../../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

type Filter = 'all' | 'pending' | 'accepted' | 'in_progress' | 'completed';

const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'in_progress', label: 'Active' },
    { key: 'completed', label: 'Completed' },
];

function getStatusBg(s: string) {
    const m: Record<string, object> = {
        pending: { backgroundColor: Colors.warningLight },
        accepted: { backgroundColor: Colors.successLight },
        rejected: { backgroundColor: Colors.errorLight },
        in_progress: { backgroundColor: Colors.infoLight },
        completed: { backgroundColor: '#F0FDF4' },
        cancelled: { backgroundColor: Colors.surfaceAlt },
    };
    return m[s] ?? m.pending;
}

function getStatusColor(s: string) {
    const m: Record<string, object> = {
        pending: { color: '#92400E' },
        accepted: { color: '#065F46' },
        rejected: { color: '#991B1B' },
        in_progress: { color: '#1E40AF' },
        completed: { color: '#14532D' },
        cancelled: { color: '#374151' },
    };
    return m[s] ?? m.pending;
}

export default function OwnerBookings() {
    const user = useAuthStore((s) => s.user);
    const { toast, showToast, hideToast } = useToast();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');

    // Duration modal
    const [durationModal, setDurationModal] = useState(false);
    const [durationInput, setDurationInput] = useState('');
    const [activeBid, setActiveBid] = useState('');

    // Reject note modal
    const [rejectModal, setRejectModal] = useState(false);
    const [rejectNote, setRejectNote] = useState('');
    const [activeRejectId, setActiveRejectId] = useState('');

    useFocusEffect(useCallback(() => { load(); }, []));

    const load = async () => {
        setLoading(true);
        const g = await getOrCreateGarage(user!.uid, user!.name);
        const b = await getBookingsByGarage(g.id);
        setBookings(b.sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
    };

    const act = async (id: string, fields: Partial<Booking>) => {
        await updateBookingFields(id, fields);
        load();
    };

    const filtered = filter === 'all'
        ? bookings
        : bookings.filter((b) => b.status === filter);

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />;

    return (
        <View style={styles.container}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.title}>Bookings</Text>
                <Text style={styles.subtitle}>{bookings.length} total</Text>
            </View>

            {/* ── Filter chips ───────────────────────────────────────────── */}
            <View style={styles.filterWrap}>
                {FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── List ───────────────────────────────────────────────────── */}
            <FlatList
                data={filtered}
                keyExtractor={(b) => b.id}
                contentContainerStyle={styles.list}
                onRefresh={load}
                refreshing={loading}
                renderItem={({ item }) => (
                    <View style={styles.card}>

                        {/* Card header */}
                        <View style={styles.cardHeader}>
                            <View style={styles.customerIconBox}>
                                <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
                            </View>
                            <View style={styles.cardHeaderInfo}>
                                <Text style={styles.customerName}>{item.customerName}</Text>
                                <Text style={styles.bookingMeta}>{item.bikeDetails}</Text>
                            </View>
                            <View style={[styles.statusPill, getStatusBg(item.status)]}>
                                <Text style={[styles.statusPillText, getStatusColor(item.status)]}>
                                    {item.status.replace('_', ' ')}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Date & time */}
                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
                                <Text style={styles.metaText}>{item.date}</Text>
                            </View>
                            <View style={styles.metaDot} />
                            <View style={styles.metaItem}>
                                <Ionicons name="time-outline" size={14} color={Colors.textTertiary} />
                                <Text style={styles.metaText}>{item.time}</Text>
                            </View>
                        </View>

                        {/* Action buttons */}
                        <View style={styles.actionsRow}>

                            {item.status === 'pending' && (
                                <>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: Colors.successLight, borderColor: Colors.success + '40' }]}
                                        onPress={() => {
                                            act(item.id, { status: 'accepted' });
                                            showToast('Booking accepted successfully.', 'success');
                                        }}
                                    >
                                        <Ionicons name="checkmark" size={15} color={Colors.success} />
                                        <Text style={[styles.actionBtnText, { color: Colors.success }]}>Accept</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: Colors.errorLight, borderColor: Colors.error + '40' }]}
                                        onPress={() => {
                                            setActiveRejectId(item.id);
                                            setRejectNote('');
                                            setRejectModal(true);
                                        }}
                                    >
                                        <Ionicons name="close" size={15} color={Colors.error} />
                                        <Text style={[styles.actionBtnText, { color: Colors.error }]}>Decline</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {item.status === 'accepted' && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: Colors.infoLight, borderColor: Colors.info + '40' }]}
                                    onPress={() => {
                                        setActiveBid(item.id);
                                        setDurationInput('');
                                        setDurationModal(true);
                                        act(item.id, { status: 'in_progress', serviceStartedAt: Date.now() });
                                        showToast('Service started.', 'info');
                                    }}
                                >
                                    <Ionicons name="build-outline" size={15} color={Colors.info} />
                                    <Text style={[styles.actionBtnText, { color: Colors.info }]}>Start Service</Text>
                                </TouchableOpacity>
                            )}

                            {item.status === 'in_progress' && (
                                <>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: Colors.warningLight, borderColor: Colors.warning + '40' }]}
                                        onPress={() => {
                                            setActiveBid(item.id);
                                            setDurationInput('');
                                            setDurationModal(true);
                                        }}
                                    >
                                        <Ionicons name="timer-outline" size={15} color={Colors.warning} />
                                        <Text style={[styles.actionBtnText, { color: Colors.warning }]}>Set Duration</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: Colors.successLight, borderColor: Colors.success + '40' }]}
                                        onPress={() => {
                                            act(item.id, { status: 'completed', completedAt: Date.now() });
                                            showToast('Service marked as completed.', 'success');
                                        }}
                                    >
                                        <Ionicons name="checkmark-done" size={15} color={Colors.success} />
                                        <Text style={[styles.actionBtnText, { color: Colors.success }]}>Complete</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                        </View>

                        {item.estimatedDurationMin != null && item.status === 'in_progress' && (
                            <View style={styles.durationStrip}>
                                <Ionicons name="timer-outline" size={13} color={Colors.info} />
                                <Text style={styles.durationText}>
                                    Estimated: {item.estimatedDurationMin} min
                                </Text>
                            </View>
                        )}

                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
                        <Text style={styles.emptyTitle}>No bookings</Text>
                        <Text style={styles.emptyDesc}>
                            Bookings matching this filter will appear here.
                        </Text>
                    </View>
                }
            />

            {/* ── Duration Modal ─────────────────────────────────────────── */}
            <Modal
                visible={durationModal}
                transparent
                animationType="fade"
                onRequestClose={() => setDurationModal(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Estimated Duration</Text>
                        <Text style={styles.modalSubtitle}>How long will this service take?</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. 45"
                            keyboardType="numeric"
                            value={durationInput}
                            onChangeText={setDurationInput}
                            placeholderTextColor={Colors.textTertiary}
                        />
                        <Text style={styles.modalHint}>Enter duration in minutes</Text>
                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={() => {
                                const min = parseInt(durationInput);
                                if (isNaN(min) || min <= 0) {
                                    showToast('Please enter a valid number of minutes.', 'error');
                                    return;
                                }
                                act(activeBid, { estimatedDurationMin: min });
                                setDurationModal(false);
                                showToast(`Duration set to ${min} minutes.`, 'info');
                            }}
                        >
                            <Text style={styles.modalBtnText}>Confirm</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalCancelBtn}
                            onPress={() => setDurationModal(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Reject Modal ───────────────────────────────────────────── */}
            <Modal
                visible={rejectModal}
                transparent
                animationType="fade"
                onRequestClose={() => setRejectModal(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Decline Booking</Text>
                        <Text style={styles.modalSubtitle}>
                            Add an optional note for the customer
                        </Text>
                        <TextInput
                            style={[styles.modalInput, { fontSize: 15, fontWeight: '400', minHeight: 80 }]}
                            placeholder="e.g. Slot unavailable due to emergency"
                            value={rejectNote}
                            onChangeText={setRejectNote}
                            multiline
                            placeholderTextColor={Colors.textTertiary}
                        />
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: Colors.error }]}
                            onPress={() => {
                                act(activeRejectId, { status: 'rejected', rejectionNote: rejectNote.trim() });
                                setRejectModal(false);
                                showToast('Booking declined.', 'warning');
                            }}
                        >
                            <Text style={styles.modalBtnText}>Decline Booking</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalCancelBtn}
                            onPress={() => setRejectModal(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Toast ──────────────────────────────────────────────────── */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={hideToast}
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

    filterWrap: {
        flexDirection: 'row', gap: Spacing.xs,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt },
    filterChipActive: { backgroundColor: Colors.primaryLight },
    filterChipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '500' },
    filterChipTextActive: { color: Colors.primary, fontWeight: '700' },

    list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 32 },

    card: {
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        borderWidth: 1, borderColor: Colors.border,
        ...Shadow.sm, overflow: 'hidden',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
    customerIconBox: { width: 38, height: 38, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    cardHeaderInfo: { flex: 1 },
    customerName: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600' },
    bookingMeta: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
    statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
    statusPillText: { ...Typography.overline, fontWeight: '600', textTransform: 'capitalize' },

    divider: { height: 1, backgroundColor: Colors.borderLight },
    metaRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, paddingBottom: Spacing.sm },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { ...Typography.caption, color: Colors.textSecondary },
    metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.border, marginHorizontal: Spacing.sm },

    actionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, flexWrap: 'wrap' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1 },
    actionBtnText: { ...Typography.buttonSm },

    durationStrip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.infoLight, padding: Spacing.sm,
        marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: Radius.sm,
    },
    durationText: { ...Typography.caption, color: Colors.info, fontWeight: '500' },

    empty: { alignItems: 'center', marginTop: 60, gap: Spacing.sm },
    emptyTitle: { ...Typography.h3, color: Colors.textSecondary },
    emptyDesc: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },

    // Modals
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
    modalSheet: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, width: '100%', ...Shadow.lg },
    modalTitle: { ...Typography.h2, color: Colors.textPrimary, textAlign: 'center' },
    modalSubtitle: { ...Typography.caption, color: Colors.textTertiary, textAlign: 'center', marginTop: 4, marginBottom: Spacing.md },
    modalInput: {
        ...Typography.h1, color: Colors.textPrimary,
        borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg,
        padding: Spacing.md, textAlign: 'center', backgroundColor: Colors.bg,
        marginBottom: Spacing.xs,
    },
    modalHint: { ...Typography.caption, color: Colors.textTertiary, textAlign: 'center', marginBottom: Spacing.md },
    modalBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.sm },
    modalBtnText: { ...Typography.button, color: '#fff' },
    modalCancelBtn: { padding: Spacing.sm, alignItems: 'center' },
    modalCancelText: { ...Typography.button, color: Colors.textSecondary },
});
