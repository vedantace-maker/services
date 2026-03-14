import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator,
    TouchableOpacity, Alert, Modal, TextInput, ScrollView
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getBookingsByGarage, updateBookingFields  } from '../../utils/storage';
import { useAuthStore } from '../../store/authStore';
import { Booking, BookingStatus } from '../../types';
// import { getBookingsByGarage, updateBookingStatus, getAllBookings, addBooking, updateBookingFields  } from '../../utils/storage';
// import AsyncStorage from '@react-native-async-storage/async-storage';


// ─── Update any booking field ─────────────────────────────────────────────────
// async function updateBookingFields(bookingId: string, fields: Partial<Booking>): Promise<void> {
//     const raw = await AsyncStorage.getItem('@bikeservice_bookings');
//     const bookings: Booking[] = raw ? JSON.parse(raw) : [];
//     const idx = bookings.findIndex((b) => b.id === bookingId);
//     if (idx >= 0) {
//         bookings[idx] = { ...bookings[idx], ...fields };
//         await AsyncStorage.setItem('@bikeservice_bookings', JSON.stringify(bookings));
//     }
// }

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<BookingStatus, { bg: string; text: string; label: string; icon: string }> = {
    pending: { bg: '#FEF9C3', text: '#854D0E', label: 'Pending', icon: '⏳' },
    accepted: { bg: '#DCFCE7', text: '#166534', label: 'Accepted', icon: '✅' },
    rejected: { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected', icon: '❌' },
    in_progress: { bg: '#DBEAFE', text: '#1E40AF', label: 'In Service', icon: '🔧' },
    completed: { bg: '#F0FDF4', text: '#15803D', label: 'Completed', icon: '🎉' },
    cancelled: { bg: '#F4F4F5', text: '#71717A', label: 'Cancelled', icon: '🚫' },
};

// ─── Duration Picker Modal ────────────────────────────────────────────────────
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180];

interface DurationModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (minutes: number) => void;
}

function DurationModal({ visible, onClose, onConfirm }: DurationModalProps) {
    const [selected, setSelected] = useState(60);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={mStyles.backdrop} activeOpacity={1} onPress={onClose}>
                <View style={mStyles.sheet}>
                    <View style={mStyles.header}>
                        <Text style={mStyles.title}>⏱️ Set Estimated Service Time</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={mStyles.close}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={mStyles.subtitle}>How long will this service take?</Text>

                    <View style={mStyles.optionsGrid}>
                        {DURATION_OPTIONS.map((min) => (
                            <TouchableOpacity
                                key={min}
                                style={[mStyles.option, selected === min && mStyles.optionActive]}
                                onPress={() => setSelected(min)}
                            >
                                <Text style={[mStyles.optionText, selected === min && mStyles.optionTextActive]}>
                                    {min < 60
                                        ? `${min} min`
                                        : min === 60
                                            ? '1 hr'
                                            : `${Math.floor(min / 60)}h ${min % 60 > 0 ? `${min % 60}m` : ''}`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={mStyles.confirmBtn}
                        onPress={() => { onConfirm(selected); onClose(); }}
                    >
                        <Text style={mStyles.confirmBtnText}>Confirm Duration</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const mStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    close: { fontSize: 18, color: '#aaa', padding: 4 },
    subtitle: { color: '#888', fontSize: 13, marginBottom: 16 },
    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    option: {
        borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
        paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#fff'
    },
    optionActive: { borderColor: '#FF6B35', backgroundColor: '#FF6B35' },
    optionText: { color: '#555', fontWeight: '600', fontSize: 14 },
    optionTextActive: { color: '#fff' },
    confirmBtn: { backgroundColor: '#FF6B35', padding: 14, borderRadius: 12, alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

// ─── Reject Note Modal ─────────────────────────────────────────────────────────
interface RejectModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (note: string) => void;
}

function RejectModal({ visible, onClose, onConfirm }: RejectModalProps) {
    const [note, setNote] = useState('');
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={rStyles.backdrop} activeOpacity={1} onPress={onClose}>
                <View style={rStyles.sheet}>
                    <View style={rStyles.header}>
                        <Text style={rStyles.title}>❌ Reject Booking</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={rStyles.close}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={rStyles.subtitle}>Optionally add a reason (visible to customer)</Text>
                    <TextInput
                        style={rStyles.input}
                        placeholder="e.g. Slot already taken, garage maintenance..."
                        value={note}
                        onChangeText={setNote}
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#aaa"
                    />
                    <View style={rStyles.btnRow}>
                        <TouchableOpacity style={rStyles.cancelBtn} onPress={onClose}>
                            <Text style={rStyles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={rStyles.rejectBtn}
                            onPress={() => { onConfirm(note.trim()); setNote(''); onClose(); }}
                        >
                            <Text style={rStyles.rejectText}>Reject Booking</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const rStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    close: { fontSize: 18, color: '#aaa', padding: 4 },
    subtitle: { color: '#888', fontSize: 13, marginBottom: 12 },
    input: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
        padding: 12, fontSize: 14, color: '#222', marginBottom: 16,
        textAlignVertical: 'top', minHeight: 80
    },
    btnRow: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 13, borderRadius: 10, alignItems: 'center' },
    cancelText: { color: '#888', fontWeight: '600' },
    rejectBtn: { flex: 1, backgroundColor: '#EF4444', padding: 13, borderRadius: 10, alignItems: 'center' },
    rejectText: { color: '#fff', fontWeight: 'bold' },
});

// ─── Booking Card ─────────────────────────────────────────────────────────────
interface BookingCardProps {
    item: Booking;
    onRefresh: () => void;
}

function BookingCard({ item, onRefresh }: BookingCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [durationModalVisible, setDurationModalVisible] = useState(false);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);

    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;

    const handleAccept = async () => {
        await updateBookingFields(item.id, { status: 'accepted' });
        Alert.alert('✅ Accepted', `Booking for ${item.customerName} has been accepted.`);
        onRefresh();
    };

    const handleReject = async (note: string) => {
        await updateBookingFields(item.id, { status: 'rejected', rejectionNote: note || undefined });
        Alert.alert('Booking Rejected', `Booking for ${item.customerName} has been rejected.`);
        onRefresh();
    };

    const handleStartService = async () => {
        Alert.alert(
            '🔧 Start Service',
            `Start servicing ${item.customerName}'s vehicle now?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start',
                    onPress: async () => {
                        await updateBookingFields(item.id, {
                            status: 'in_progress',
                            serviceStartedAt: Date.now(),
                        });
                        onRefresh();
                    },
                },
            ]
        );
    };

    const handleSetDuration = async (minutes: number) => {
        await updateBookingFields(item.id, { estimatedDurationMin: minutes });
        Alert.alert('⏱️ Duration Set', `Estimated service time set to ${minutes} minutes.`);
        onRefresh();
    };

    const handleComplete = async () => {
        Alert.alert(
            '🎉 Complete Service',
            'Mark this service as completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: async () => {
                        await updateBookingFields(item.id, {
                            status: 'completed',
                            completedAt: Date.now(),
                        });
                        onRefresh();
                    },
                },
            ]
        );
    };

    return (
        <View style={cardStyles.card}>

            {/* ── Top Row ─────────────────────────────────────────── */}
            <View style={cardStyles.topRow}>
                <View style={{ flex: 1 }}>
                    <Text style={cardStyles.customerName}>👤 {item.customerName}</Text>
                    <Text style={cardStyles.info}>📅 {item.date}   🕐 {item.time}</Text>
                    <Text style={cardStyles.bike}>🛵 {item.bikeDetails}</Text>
                </View>
                <View style={[cardStyles.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[cardStyles.badgeText, { color: cfg.text }]}>
                        {cfg.icon} {cfg.label}
                    </Text>
                </View>
            </View>

            {/* ── Extra info when in_progress ─────────────────────── */}
            {item.status === 'in_progress' && item.estimatedDurationMin != null ? (
                <View style={cardStyles.infoRow}>
                    <Text style={cardStyles.infoRowText}>
                        ⏱️ Estimated: {item.estimatedDurationMin} min
                    </Text>
                    {item.serviceStartedAt != null ? (
                        <Text style={cardStyles.infoRowText}>
                            🚀 Started: {new Date(item.serviceStartedAt).toLocaleTimeString()}
                        </Text>
                    ) : null}
                </View>
            ) : null}

            {item.status === 'completed' && item.completedAt != null ? (
                <Text style={cardStyles.completedText}>
                    🎉 Completed at {new Date(item.completedAt).toLocaleTimeString()}
                </Text>
            ) : null}

            {item.status === 'rejected' && item.rejectionNote ? (
                <Text style={cardStyles.rejectNote}>📝 {item.rejectionNote}</Text>
            ) : null}

            {/* ── PENDING: Accept / Reject ─────────────────────────── */}
            {item.status === 'pending' ? (
                <View style={cardStyles.actionRow}>
                    <TouchableOpacity
                        style={[cardStyles.actionBtn, cardStyles.rejectBtn]}
                        onPress={() => setRejectModalVisible(true)}
                    >
                        <Text style={cardStyles.rejectBtnText}>✕  Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[cardStyles.actionBtn, cardStyles.acceptBtn]}
                        onPress={handleAccept}
                    >
                        <Text style={cardStyles.acceptBtnText}>✓  Accept</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* ── ACCEPTED / IN_PROGRESS: More Details ─────────────── */}
            {item.status === 'accepted' || item.status === 'in_progress' ? (
                <>
                    <TouchableOpacity
                        style={cardStyles.moreDetailsBtn}
                        onPress={() => setExpanded((v) => !v)}
                    >
                        <Text style={cardStyles.moreDetailsBtnText}>
                            {expanded ? '▲  Hide Details' : '▼  More Details'}
                        </Text>
                    </TouchableOpacity>

                    {expanded ? (
                        <View style={cardStyles.detailsPanel}>

                            {/* Start Service */}
                            {item.status === 'accepted' ? (
                                <TouchableOpacity
                                    style={[cardStyles.serviceBtn, { backgroundColor: '#2563EB' }]}
                                    onPress={handleStartService}
                                >
                                    <Text style={cardStyles.serviceBtnIcon}>🔧</Text>
                                    <View>
                                        <Text style={cardStyles.serviceBtnTitle}>Start Service</Text>
                                        <Text style={cardStyles.serviceBtnSub}>Mark vehicle intake & begin work</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : null}

                            {/* Set Service Time */}
                            {item.status === 'in_progress' ? (
                                <TouchableOpacity
                                    style={[cardStyles.serviceBtn, { backgroundColor: '#7C3AED' }]}
                                    onPress={() => setDurationModalVisible(true)}
                                >
                                    <Text style={cardStyles.serviceBtnIcon}>⏱️</Text>
                                    <View>
                                        <Text style={cardStyles.serviceBtnTitle}>
                                            {item.estimatedDurationMin != null
                                                ? `Update Duration (${item.estimatedDurationMin} min)`
                                                : 'Set Service Time'}
                                        </Text>
                                        <Text style={cardStyles.serviceBtnSub}>Set estimated completion time</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : null}

                            {/* Complete Service */}
                            {item.status === 'in_progress' ? (
                                <TouchableOpacity
                                    style={[cardStyles.serviceBtn, { backgroundColor: '#16A34A' }]}
                                    onPress={handleComplete}
                                >
                                    <Text style={cardStyles.serviceBtnIcon}>🎉</Text>
                                    <View>
                                        <Text style={cardStyles.serviceBtnTitle}>Mark as Completed</Text>
                                        <Text style={cardStyles.serviceBtnSub}>Vehicle is ready for pickup</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : null}

                        </View>
                    ) : null}
                </>
            ) : null}

            {/* Modals */}
            <DurationModal
                visible={durationModalVisible}
                onClose={() => setDurationModalVisible(false)}
                onConfirm={handleSetDuration}
            />
            <RejectModal
                visible={rejectModalVisible}
                onClose={() => setRejectModalVisible(false)}
                onConfirm={handleReject}
            />
        </View>
    );
}

const cardStyles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 3 },
    topRow: { flexDirection: 'row', gap: 10 },
    customerName: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    info: { color: '#555', marginTop: 4, fontSize: 13 },
    bike: { color: '#888', marginTop: 2, fontSize: 13 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
    badgeText: { fontSize: 11, fontWeight: '700' },

    infoRow: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginTop: 10, gap: 4 },
    infoRowText: { color: '#1E40AF', fontSize: 12 },
    completedText: { color: '#15803D', fontSize: 13, marginTop: 8 },
    rejectNote: { color: '#991B1B', fontSize: 12, marginTop: 6 },

    // Accept / Reject buttons
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    actionBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
    rejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
    rejectBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
    acceptBtn: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#BBF7D0' },
    acceptBtnText: { color: '#16A34A', fontWeight: '700', fontSize: 14 },

    // More details toggle
    moreDetailsBtn: {
        marginTop: 12, paddingVertical: 10, borderRadius: 8,
        backgroundColor: '#f9f9f9', alignItems: 'center',
        borderWidth: 1, borderColor: '#eee'
    },
    moreDetailsBtnText: { color: '#FF6B35', fontWeight: '600', fontSize: 13 },

    // Expanded details panel
    detailsPanel: { marginTop: 10, gap: 10 },
    serviceBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        padding: 14, borderRadius: 12,
    },
    serviceBtnIcon: { fontSize: 24 },
    serviceBtnTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
    serviceBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ViewBookingsScreen() {
    const user = useAuthStore((s) => s.user);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<BookingStatus | 'all'>('all');

    useFocusEffect(
        useCallback(() => {
            loadBookings();
        }, [])
    );

    const loadBookings = async () => {
        setLoading(true);
        const data = await getBookingsByGarage(user!.uid);
        setBookings(data);
        setLoading(false);
    };

    const FILTERS: { key: BookingStatus | 'all'; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'pending', label: '⏳ Pending' },
        { key: 'accepted', label: '✅ Accepted' },
        { key: 'in_progress', label: '🔧 In Service' },
        { key: 'completed', label: '🎉 Done' },
        { key: 'rejected', label: '❌ Rejected' },
    ];

    const filtered = filter === 'all'
        ? bookings
        : bookings.filter((b) => b.status === filter);

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#FF6B35" />;

    return (
        <View style={screenStyles.container}>

            {/* Filter tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={screenStyles.filterBar}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingVertical: 4 }}
            >
                {FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[screenStyles.filterChip, filter === f.key && screenStyles.filterChipActive]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Text style={[screenStyles.filterChipText, filter === f.key && screenStyles.filterChipTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <FlatList
                data={filtered}
                keyExtractor={(b) => b.id}
                renderItem={({ item }) => (
                    <BookingCard item={item} onRefresh={loadBookings} />
                )}
                ListEmptyComponent={
                    <View style={screenStyles.emptyBox}>
                        <Text style={screenStyles.emptyText}>No bookings here.</Text>
                        <Text style={screenStyles.emptyHint}>
                            {filter === 'all'
                                ? 'Make sure your schedule is set up.'
                                : `No ${filter} bookings yet.`}
                        </Text>
                    </View>
                }
                onRefresh={loadBookings}
                refreshing={loading}
                contentContainerStyle={{ paddingBottom: 30 }}
            />
        </View>
    );
}

const screenStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9', padding: 16 },
    filterBar: { marginBottom: 12, flexGrow: 0 },
    filterChip: {
        borderWidth: 1.5, borderColor: '#ddd', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff'
    },
    filterChipActive: { borderColor: '#FF6B35', backgroundColor: '#FF6B35' },
    filterChipText: { color: '#666', fontWeight: '600', fontSize: 13 },
    filterChipTextActive: { color: '#fff' },
    emptyBox: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#888', fontSize: 16 },
    emptyHint: { color: '#bbb', fontSize: 13, marginTop: 6 },
});
