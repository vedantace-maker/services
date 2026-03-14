import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Alert, ActivityIndicator, FlatList, Modal
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { getGarageById, saveGarage, getBookingsByGarage } from '../../utils/storage';
import { Garage, GarageServices, Booking, BookingStatus } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────
const PRESET_BIKE_SERVICES = [
    'Oil Change', 'Chain & Sprocket Service', 'Gear Adjustment',
    'Clutch Repair', 'Engine Tune-up', 'Brake Adjustment',
    'Air Filter Clean', 'Tyre Puncture Fix', 'Battery Check', 'Full Service',
];

const PRESET_SCOOTY_SERVICES = [
    'Oil Change', 'Belt Change', 'CVT Service', 'Brake Adjustment',
    'Air Filter Clean', 'Tyre Puncture Fix', 'Battery Check',
    'Body Work', 'Headlight Fix', 'Full Service',
];

const STATUS_CONFIG: Record<BookingStatus, { bg: string; text: string; label: string; icon: string }> = {
    pending: { bg: '#FEF9C3', text: '#854D0E', label: 'Pending', icon: '⏳' },
    accepted: { bg: '#DCFCE7', text: '#166534', label: 'Accepted', icon: '✅' },
    rejected: { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected', icon: '❌' },
    in_progress: { bg: '#DBEAFE', text: '#1E40AF', label: 'In Service', icon: '🔧' },
    completed: { bg: '#F0FDF4', text: '#15803D', label: 'Completed', icon: '🎉' },
    cancelled: { bg: '#F4F4F5', text: '#71717A', label: 'Cancelled', icon: '🚫' },
};

// ─── Customer Detail Modal ─────────────────────────────────────────────────────
interface CustomerModalProps {
    visible: boolean;
    bookings: Booking[];
    customerName: string;
    onClose: () => void;
}

function CustomerDetailModal({ visible, bookings, customerName, onClose }: CustomerModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={cStyles.backdrop} activeOpacity={1} onPress={onClose}>
                <View style={cStyles.sheet}>
                    <View style={cStyles.header}>
                        <View>
                            <Text style={cStyles.title}>👤 {customerName}</Text>
                            <Text style={cStyles.subtitle}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''} total</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={cStyles.close}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {bookings.map((b) => {
                            const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
                            return (
                                <View key={b.id} style={cStyles.bookingRow}>
                                    <View style={cStyles.bookingLeft}>
                                        <Text style={cStyles.bookingDate}>📅 {b.date}  🕐 {b.time}</Text>
                                        <Text style={cStyles.bookingBike}>🛵 {b.bikeDetails}</Text>
                                        {b.estimatedDurationMin != null ? (
                                            <Text style={cStyles.bookingExtra}>⏱️ Est. {b.estimatedDurationMin} min</Text>
                                        ) : null}
                                        {b.completedAt != null ? (
                                            <Text style={cStyles.bookingExtra}>
                                                ✅ Done at {new Date(b.completedAt).toLocaleTimeString()}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <View style={[cStyles.statusBadge, { backgroundColor: cfg.bg }]}>
                                        <Text style={[cStyles.statusText, { color: cfg.text }]}>
                                            {cfg.icon} {cfg.label}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const cStyles = StyleSheet.create({


    // set the popup location
    //bottom
    // backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    // sheet: {
    //     backgroundColor: '#fff', borderTopLeftRadius: 24,
    //     borderTopRightRadius: 24, padding: 20, maxHeight: '75%', paddingBottom: 36
    // },
    // center
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',       // ← center instead of flex-end
        alignItems: 'center',           // ← center horizontally
        padding: 20,                    // ← padding so it doesn't touch screen edges
    },
    sheet: {
        backgroundColor: '#fff',
        borderRadius: 24,               // ← all corners rounded, not just top
        width: '100%',                  // ← full width within padding
        maxHeight: '80%',
        padding: 20,
        paddingBottom: 24,
    },


    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 16,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 14
    },
    title: { fontSize: 18, fontWeight: 'bold', color: '#222' },
    subtitle: { fontSize: 13, color: '#aaa', marginTop: 2 },
    close: { fontSize: 20, color: '#aaa', padding: 4 },
    bookingRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#f8f8f8'
    },
    bookingLeft: { flex: 1, marginRight: 10 },
    bookingDate: { fontSize: 14, color: '#333', fontWeight: '500' },
    bookingBike: { fontSize: 13, color: '#888', marginTop: 3 },
    bookingExtra: { fontSize: 12, color: '#aaa', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
    statusText: { fontSize: 11, fontWeight: '700' },
});

// ─── Customer List Component ───────────────────────────────────────────────────
interface CustomerGroup {
    customerUid: string;
    customerName: string;
    bookings: Booking[];
    pending: number;
    accepted: number;
    inProgress: number;
    completed: number;
    rejected: number;
}

interface CustomerListProps {
    bookings: Booking[];
}

function CustomerList({ bookings }: CustomerListProps) {
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerGroup | null>(null);
    const [filterStatus, setFilterStatus] = useState<BookingStatus | 'all'>('all');

    // Group bookings by customer
    const customerMap: Record<string, CustomerGroup> = {};
    bookings.forEach((b) => {
        if (!customerMap[b.customerUid]) {
            customerMap[b.customerUid] = {
                customerUid: b.customerUid,
                customerName: b.customerName,
                bookings: [],
                pending: 0, accepted: 0, inProgress: 0, completed: 0, rejected: 0,
            };
        }
        customerMap[b.customerUid].bookings.push(b);
        if (b.status === 'pending') customerMap[b.customerUid].pending++;
        if (b.status === 'accepted') customerMap[b.customerUid].accepted++;
        if (b.status === 'in_progress') customerMap[b.customerUid].inProgress++;
        if (b.status === 'completed') customerMap[b.customerUid].completed++;
        if (b.status === 'rejected') customerMap[b.customerUid].rejected++;
    });

    const customers = Object.values(customerMap);

    // Filter customers by status
    const filtered = filterStatus === 'all'
        ? customers
        : customers.filter((c) =>
            c.bookings.some((b) => b.status === filterStatus)
        );

    const FILTERS: { key: BookingStatus | 'all'; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'pending', label: '⏳ Pending' },
        { key: 'accepted', label: '✅ Accepted' },
        { key: 'in_progress', label: '🔧 In Service' },
        { key: 'completed', label: '🎉 Completed' },
        { key: 'rejected', label: '❌ Rejected' },
    ];

    if (bookings.length === 0) {
        return (
            <View style={listStyles.emptyBox}>
                <Text style={listStyles.emptyIcon}>📋</Text>
                <Text style={listStyles.emptyText}>No customers yet</Text>
                <Text style={listStyles.emptyHint}>Bookings will appear here once customers start booking.</Text>
            </View>
        );
    }

    return (
        <View>
            {/* Filter bar */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            >
                {FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[listStyles.filterChip, filterStatus === f.key && listStyles.filterChipActive]}
                        onPress={() => setFilterStatus(f.key)}
                    >
                        <Text style={[listStyles.filterText, filterStatus === f.key && listStyles.filterTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Customer count */}
            <Text style={listStyles.countLabel}>
                {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
                {filterStatus !== 'all' ? ` with ${filterStatus.replace('_', ' ')} bookings` : ''}
            </Text>

            {/* Customer cards */}
            {filtered.map((customer) => {
                const initial = customer.customerName.charAt(0).toUpperCase();
                const latestBooking = customer.bookings[0];
                const latestCfg = STATUS_CONFIG[latestBooking?.status] ?? STATUS_CONFIG.pending;

                return (
                    <TouchableOpacity
                        key={customer.customerUid}
                        style={listStyles.customerCard}
                        onPress={() => setSelectedCustomer(customer)}
                        activeOpacity={0.85}
                    >
                        {/* Avatar + Name */}
                        <View style={listStyles.cardLeft}>
                            <View style={listStyles.avatar}>
                                <Text style={listStyles.avatarText}>{initial}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={listStyles.customerName}>{customer.customerName}</Text>
                                <Text style={listStyles.latestBooking}>
                                    Latest: {latestBooking?.date}  {latestBooking?.time}
                                </Text>
                                <Text style={listStyles.bikeDetails} numberOfLines={1}>
                                    🛵 {latestBooking?.bikeDetails}
                                </Text>
                            </View>
                        </View>

                        {/* Stats row */}
                        <View style={listStyles.statsRow}>
                            {customer.pending > 0 ? (
                                <View style={[listStyles.statBadge, { backgroundColor: '#FEF9C3' }]}>
                                    <Text style={[listStyles.statText, { color: '#854D0E' }]}>
                                        ⏳ {customer.pending}
                                    </Text>
                                </View>
                            ) : null}
                            {customer.accepted > 0 ? (
                                <View style={[listStyles.statBadge, { backgroundColor: '#DCFCE7' }]}>
                                    <Text style={[listStyles.statText, { color: '#166534' }]}>
                                        ✅ {customer.accepted}
                                    </Text>
                                </View>
                            ) : null}
                            {customer.inProgress > 0 ? (
                                <View style={[listStyles.statBadge, { backgroundColor: '#DBEAFE' }]}>
                                    <Text style={[listStyles.statText, { color: '#1E40AF' }]}>
                                        🔧 {customer.inProgress}
                                    </Text>
                                </View>
                            ) : null}
                            {customer.completed > 0 ? (
                                <View style={[listStyles.statBadge, { backgroundColor: '#F0FDF4' }]}>
                                    <Text style={[listStyles.statText, { color: '#15803D' }]}>
                                        🎉 {customer.completed}
                                    </Text>
                                </View>
                            ) : null}
                            {customer.rejected > 0 ? (
                                <View style={[listStyles.statBadge, { backgroundColor: '#FEE2E2' }]}>
                                    <Text style={[listStyles.statText, { color: '#991B1B' }]}>
                                        ❌ {customer.rejected}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Total bookings + arrow */}
                        <View style={listStyles.cardRight}>
                            <Text style={listStyles.totalCount}>{customer.bookings.length}</Text>
                            <Text style={listStyles.totalLabel}>bookings</Text>
                            <Text style={listStyles.arrow}>›</Text>
                        </View>
                    </TouchableOpacity>
                );
            })}

            {/* Customer Detail Modal */}
            {selectedCustomer != null ? (
                <CustomerDetailModal
                    visible={selectedCustomer != null}
                    bookings={selectedCustomer.bookings}
                    customerName={selectedCustomer.customerName}
                    onClose={() => setSelectedCustomer(null)}
                />
            ) : null}
        </View>
    );
}

const listStyles = StyleSheet.create({
    emptyBox: { alignItems: 'center', paddingVertical: 32 },
    emptyIcon: { fontSize: 40, marginBottom: 10 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#888' },
    emptyHint: { fontSize: 13, color: '#bbb', marginTop: 4, textAlign: 'center' },

    filterChip: {
        borderWidth: 1.5, borderColor: '#ddd', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff'
    },
    filterChipActive: { borderColor: '#FF6B35', backgroundColor: '#FF6B35' },
    filterText: { color: '#666', fontWeight: '600', fontSize: 12 },
    filterTextActive: { color: '#fff' },

    countLabel: { fontSize: 12, color: '#aaa', marginBottom: 10 },

    customerCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 14,
        marginBottom: 10, elevation: 2,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4
    },
    cardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
    avatar: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center'
    },
    avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    customerName: { fontSize: 15, fontWeight: 'bold', color: '#222' },
    latestBooking: { fontSize: 12, color: '#888', marginTop: 2 },
    bikeDetails: { fontSize: 12, color: '#aaa', marginTop: 1 },

    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    statBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    statText: { fontSize: 11, fontWeight: '700' },

    cardRight: { position: 'absolute', right: 14, top: 14, alignItems: 'center' },
    totalCount: { fontSize: 20, fontWeight: 'bold', color: '#FF6B35', textAlign: 'center' },
    totalLabel: { fontSize: 10, color: '#aaa', textAlign: 'center' },
    arrow: { fontSize: 22, color: '#ddd', marginTop: 2 },
});

// ─── Summary Stats Bar ─────────────────────────────────────────────────────────
interface StatsBarProps {
    bookings: Booking[];
}

function StatsBar({ bookings }: StatsBarProps) {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const inService = bookings.filter((b) => b.status === 'in_progress').length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const accepted = bookings.filter((b) => b.status === 'accepted').length;

    const stats = [
        { label: 'Total', value: total, color: '#FF6B35', bg: '#FFF3EF' },
        { label: 'Pending', value: pending, color: '#854D0E', bg: '#FEF9C3' },
        { label: 'Accepted', value: accepted, color: '#166534', bg: '#DCFCE7' },
        { label: 'In Service', value: inService, color: '#1E40AF', bg: '#DBEAFE' },
        { label: 'Completed', value: completed, color: '#15803D', bg: '#F0FDF4' },
    ];

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
        >
            {stats.map((s) => (
                <View key={s.label} style={[statStyles.box, { backgroundColor: s.bg }]}>
                    <Text style={[statStyles.value, { color: s.color }]}>{s.value}</Text>
                    <Text style={[statStyles.label, { color: s.color }]}>{s.label}</Text>
                </View>
            ))}
        </ScrollView>
    );
}

const statStyles = StyleSheet.create({
    box: {
        width: 80, paddingVertical: 12, paddingHorizontal: 8,
        borderRadius: 12, alignItems: 'center'
    },
    value: { fontSize: 22, fontWeight: 'bold' },
    label: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});

// ─── Main Dashboard Screen ─────────────────────────────────────────────────────
export default function OwnerDashboard() {
    const user = useAuthStore((s) => s.user);
    const [garage, setGarage] = useState<Garage | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(true);
    const [activeTab, setActiveTab] = useState<'customers' | 'services'>('customers');

    // Services state
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedBike, setSelectedBike] = useState<string[]>([]);
    const [selectedScooty, setSelectedScooty] = useState<string[]>([]);
    const [customBike, setCustomBike] = useState('');
    const [customScooty, setCustomScooty] = useState('');
    const [customBikeList, setCustomBikeList] = useState<string[]>([]);
    const [customScootyList, setCustomScootyList] = useState<string[]>([]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        if (!user?.uid) return;
        setLoadingBookings(true);
        const [g, b] = await Promise.all([
            getGarageById(user.uid),
            getBookingsByGarage(user.uid),
        ]);
        setGarage(g);
        setBookings(b);
        setLoadingBookings(false);
    };

    // ── Services helpers ──────────────────────────────────────────────────────
    const openEditMode = () => {
        if (!garage) return;
        const bikeServices = garage.services?.bike ?? [];
        const scootyServices = garage.services?.scooty ?? [];
        setSelectedBike(bikeServices.filter((s) => PRESET_BIKE_SERVICES.includes(s)));
        setCustomBikeList(bikeServices.filter((s) => !PRESET_BIKE_SERVICES.includes(s)));
        setSelectedScooty(scootyServices.filter((s) => PRESET_SCOOTY_SERVICES.includes(s)));
        setCustomScootyList(scootyServices.filter((s) => !PRESET_SCOOTY_SERVICES.includes(s)));
        setEditMode(true);
    };

    const toggleService = (
        service: string,
        selected: string[],
        setSelected: (v: string[]) => void
    ) => {
        setSelected(
            selected.includes(service)
                ? selected.filter((s) => s !== service)
                : [...selected, service]
        );
    };

    const addCustomService = (
        value: string,
        setValue: (v: string) => void,
        list: string[],
        setList: (v: string[]) => void
    ) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        if (list.includes(trimmed)) { Alert.alert('Duplicate', 'This service is already added.'); return; }
        setList([...list, trimmed]);
        setValue('');
    };

    const removeCustom = (service: string, list: string[], setList: (v: string[]) => void) => {
        setList(list.filter((s) => s !== service));
    };

    const handleSaveServices = async () => {
        if (!garage) return;
        const allBike = [...selectedBike, ...customBikeList];
        const allScooty = [...selectedScooty, ...customScootyList];
        if (allBike.length === 0 && allScooty.length === 0) {
            Alert.alert('Error', 'Please add at least one service.');
            return;
        }
        setSaving(true);
        try {
            const updatedGarage: Garage = { ...garage, services: { bike: allBike, scooty: allScooty } };
            await saveGarage(updatedGarage);
            setGarage(updatedGarage);
            setEditMode(false);
            Alert.alert('✅ Saved', 'Services updated successfully.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const renderServiceChip = (
        service: string, selected: string[],
        setSelected: (v: string[]) => void, color: string
    ) => (
        <TouchableOpacity
            key={service}
            style={[styles.chip, { borderColor: color }, selected.includes(service) && { backgroundColor: color }]}
            onPress={() => toggleService(service, selected, setSelected)}
        >
            <Text style={[styles.chipText, { color: selected.includes(service) ? '#fff' : color }]}>
                {selected.includes(service) ? '✓ ' : ''}{service}
            </Text>
        </TouchableOpacity>
    );

    const renderViewChip = (service: string, color: string) => (
        <View key={service} style={[styles.viewChip, { backgroundColor: color + '18', borderColor: color + '44' }]}>
            <Text style={[styles.viewChipText, { color }]}>{service}</Text>
        </View>
    );

    const bikeServices = garage?.services?.bike ?? [];
    const scootyServices = garage?.services?.scooty ?? [];

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

            {/* ── Header ─────────────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcome}>Welcome back,</Text>
                    <Text style={styles.name}>{user?.name} 👋</Text>
                </View>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>🔧 Owner</Text>
                </View>
            </View>

            {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
            {loadingBookings ? (
                <ActivityIndicator color="#FF6B35" style={{ marginVertical: 12 }} />
            ) : (
                <View style={styles.statsSection}>
                    <StatsBar bookings={bookings} />
                </View>
            )}

            {/* ── Tab Toggle ─────────────────────────────────────────────────────── */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'customers' && styles.tabActive]}
                    onPress={() => setActiveTab('customers')}
                >
                    <Text style={[styles.tabText, activeTab === 'customers' && styles.tabTextActive]}>
                        👥 Customers
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'services' && styles.tabActive]}
                    onPress={() => setActiveTab('services')}
                >
                    <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>
                        🔧 Services
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── CUSTOMERS TAB ──────────────────────────────────────────────────── */}
            {activeTab === 'customers' ? (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Customer Bookings</Text>
                    {loadingBookings ? (
                        <ActivityIndicator color="#FF6B35" />
                    ) : (
                        <CustomerList bookings={bookings} />
                    )}
                </View>
            ) : null}

            {/* ── SERVICES TAB ───────────────────────────────────────────────────── */}
            {activeTab === 'services' ? (
                !editMode ? (
                    <>
                        {/* Bike Services view */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>🏍️ Bike Services</Text>
                                <Text style={styles.countBadge}>{bikeServices.length} services</Text>
                            </View>
                            {bikeServices.length > 0 ? (
                                <View style={styles.chipsWrap}>
                                    {bikeServices.map((s) => renderViewChip(s, '#2563EB'))}
                                </View>
                            ) : (
                                <Text style={styles.emptyServices}>No bike services added yet.</Text>
                            )}
                        </View>

                        {/* Scooty Services view */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>🛵 Scooty Services</Text>
                                <Text style={styles.countBadge}>{scootyServices.length} services</Text>
                            </View>
                            {scootyServices.length > 0 ? (
                                <View style={styles.chipsWrap}>
                                    {scootyServices.map((s) => renderViewChip(s, '#7C3AED'))}
                                </View>
                            ) : (
                                <Text style={styles.emptyServices}>No scooty services added yet.</Text>
                            )}
                        </View>

                        <TouchableOpacity style={styles.editServicesBtn} onPress={openEditMode}>
                            <Text style={styles.editServicesBtnText}>✏️  Edit Services</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    /* Services edit mode */
                    <>
                        {/* Bike edit */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>🏍️ Bike Services (with gear)</Text>
                            <Text style={styles.editHint}>Tap to select / deselect</Text>
                            <View style={styles.chipsWrap}>
                                {PRESET_BIKE_SERVICES.map((s) =>
                                    renderServiceChip(s, selectedBike, setSelectedBike, '#2563EB')
                                )}
                            </View>
                            {customBikeList.length > 0 ? (
                                <View style={styles.customSection}>
                                    <Text style={styles.customLabel}>Custom Services:</Text>
                                    <View style={styles.chipsWrap}>
                                        {customBikeList.map((s) => (
                                            <TouchableOpacity
                                                key={s}
                                                style={[styles.chip, styles.customChip]}
                                                onPress={() => removeCustom(s, customBikeList, setCustomBikeList)}
                                            >
                                                <Text style={styles.customChipText}>{s}  ✕</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ) : null}
                            <View style={styles.addRow}>
                                <TextInput
                                    style={styles.addInput}
                                    placeholder="Add custom bike service"
                                    value={customBike}
                                    onChangeText={setCustomBike}
                                    placeholderTextColor="#aaa"
                                />
                                <TouchableOpacity
                                    style={styles.addBtn}
                                    onPress={() => addCustomService(customBike, setCustomBike, customBikeList, setCustomBikeList)}
                                >
                                    <Text style={styles.addBtnText}>+ Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Scooty edit */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>🛵 Scooty Services (without gear)</Text>
                            <Text style={styles.editHint}>Tap to select / deselect</Text>
                            <View style={styles.chipsWrap}>
                                {PRESET_SCOOTY_SERVICES.map((s) =>
                                    renderServiceChip(s, selectedScooty, setSelectedScooty, '#7C3AED')
                                )}
                            </View>
                            {customScootyList.length > 0 ? (
                                <View style={styles.customSection}>
                                    <Text style={styles.customLabel}>Custom Services:</Text>
                                    <View style={styles.chipsWrap}>
                                        {customScootyList.map((s) => (
                                            <TouchableOpacity
                                                key={s}
                                                style={[styles.chip, styles.customChipScooty]}
                                                onPress={() => removeCustom(s, customScootyList, setCustomScootyList)}
                                            >
                                                <Text style={styles.customChipScootyText}>{s}  ✕</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ) : null}
                            <View style={styles.addRow}>
                                <TextInput
                                    style={styles.addInput}
                                    placeholder="Add custom scooty service"
                                    value={customScooty}
                                    onChangeText={setCustomScooty}
                                    placeholderTextColor="#aaa"
                                />
                                <TouchableOpacity
                                    style={[styles.addBtn, { backgroundColor: '#7C3AED' }]}
                                    onPress={() => addCustomService(customScooty, setCustomScooty, customScootyList, setCustomScootyList)}
                                >
                                    <Text style={styles.addBtnText}>+ Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.btnRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditMode(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveServices} disabled={saving}>
                                {saving
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.saveBtnText}>Save Services</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </>
                )
            ) : null}
        </ScrollView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9', padding: 16 },

    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginTop: 20, marginBottom: 16
    },
    welcome: { fontSize: 14, color: '#888' },
    name: { fontSize: 22, fontWeight: 'bold', color: '#222' },
    roleBadge: { backgroundColor: '#FFF3EF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    roleText: { color: '#FF6B35', fontWeight: '600', fontSize: 13 },

    statsSection: { marginBottom: 16 },

    // Tabs
    tabRow: {
        flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
        padding: 4, marginBottom: 14, elevation: 1
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: '#FF6B35' },
    tabText: { fontWeight: '600', color: '#888', fontSize: 14 },
    tabTextActive: { color: '#fff' },

    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 4 },
    countBadge: { fontSize: 12, color: '#888', backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    editHint: { fontSize: 12, color: '#aaa', marginBottom: 12 },
    emptyServices: { color: '#bbb', fontSize: 14, fontStyle: 'italic' },

    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    chipText: { fontSize: 13, fontWeight: '500' },
    viewChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    viewChipText: { fontSize: 13, fontWeight: '500' },

    customSection: { marginTop: 12 },
    customLabel: { fontSize: 12, color: '#aaa', marginBottom: 8 },
    customChip: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
    customChipText: { color: '#2563EB', fontSize: 13 },
    customChipScooty: { backgroundColor: '#F5F3FF', borderColor: '#7C3AED' },
    customChipScootyText: { color: '#7C3AED', fontSize: 13 },

    addRow: { flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'center' },
    addInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, fontSize: 14, color: '#222' },
    addBtn: { backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
    addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

    editServicesBtn: { borderWidth: 1.5, borderColor: '#FF6B35', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
    editServicesBtnText: { color: '#FF6B35', fontWeight: '600', fontSize: 15 },

    btnRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 14, borderRadius: 12, alignItems: 'center' },
    cancelBtnText: { color: '#888', fontWeight: '600' },
    saveBtn: { flex: 1, backgroundColor: '#FF6B35', padding: 14, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: 'bold' },
});
