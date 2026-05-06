import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, TextInput, Modal, Pressable,
    Animated, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
    getMyVehicles, addVehicle, updateVehicle,
    deleteVehicle, Vehicle, VehicleType,
} from '../../../utils/services/vehicleService';
import Toast from '../../../components/Toast';
import { useToast } from '../../../hooks/useToast';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

const VEHICLE_BRANDS = {
    bike: ['Honda', 'Hero', 'Bajaj', 'TVS', 'Royal Enfield', 'Yamaha', 'KTM', 'Suzuki', 'Other'],
    scooty: ['Honda', 'TVS', 'Suzuki', 'Yamaha', 'Hero', 'Aprilia', 'Vespa', 'Other'],
};

export default function MyVehiclesScreen() {
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(0)).current;
    const { toast, showToast, hideToast } = useToast();

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Vehicle | null>(null);

    // Form state
    const [type, setType] = useState<VehicleType>('bike');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [registration, setRegistration] = useState('');
    const [color, setColor] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getMyVehicles();
            setVehicles(data);
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Failed to load vehicles.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openAdd = () => {
        setEditTarget(null);
        resetForm();
        openModal();
    };

    const openEdit = (v: Vehicle) => {
        setEditTarget(v);
        setType(v.type);
        setBrand(v.brand);
        setModel(v.model);
        setYear(v.year);
        setRegistration(v.registration);
        setColor(v.color);
        openModal();
    };

    const openModal = () => {
        setShowModal(true);
        slideAnim.setValue(0);
        Animated.spring(slideAnim, {
            toValue: 1, useNativeDriver: true, tension: 65, friction: 11,
        }).start();
    };

    const closeModal = () => {
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true })
            .start(() => { setShowModal(false); resetForm(); });
    };

    const resetForm = () => {
        setType('bike'); setBrand(''); setModel('');
        setYear(''); setRegistration(''); setColor('');
    };

    // ── Save — create or update ───────────────────────────────────────────────
    const handleSave = async () => {
        if (!brand.trim() || !model.trim() || !registration.trim()) {
            showToast('Brand, model and registration are required.', 'error');
            return;
        }

        const payload = {
            type,
            brand: brand.trim(),
            model: model.trim(),
            year: year.trim(),
            registration: registration.trim().toUpperCase(),
            color: color.trim(),
        };

        setSubmitting(true);
        try {
            if (editTarget) {
                const updated = await updateVehicle(editTarget.id, payload);
                setVehicles((prev) => prev.map((v) => v.id === updated.id ? updated : v));
                showToast('Vehicle updated.', 'success');
            } else {
                const created = await addVehicle(payload);
                setVehicles((prev) => [...prev, created]);
                showToast('Vehicle added.', 'success');
            }
            closeModal();
        } catch (e: any) {
            console.error('Vehicle save error:', JSON.stringify(e?.response?.data));
            const d = e?.response?.data;
            const msg =
                d?.detail ??
                d?.registration?.[0] ??
                d?.non_field_errors?.[0] ??
                'Failed to save vehicle.';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = (vehicle: Vehicle) => {
        Alert.alert(
            'Delete Vehicle',
            `Remove ${vehicle.brand} ${vehicle.model}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteVehicle(vehicle.id);
                            setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
                            showToast('Vehicle removed.', 'success');
                        } catch {
                            showToast('Failed to delete vehicle.', 'error');
                        }
                    },
                },
            ]
        );
    };

    // ── Render vehicle card ───────────────────────────────────────────────────
    const renderVehicle = ({ item }: { item: Vehicle }) => (
        <View style={styles.vehicleCard}>
            <View style={[
                styles.vehicleIconBox,
                { backgroundColor: item.type === 'bike' ? Colors.primaryLight : '#EDE9FE' },
            ]}>
                <Ionicons
                    name={item.type === 'bike' ? 'bicycle-outline' : 'speedometer-outline'}
                    size={26}
                    color={item.type === 'bike' ? Colors.primary : '#7C3AED'}
                />
            </View>

            <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{item.brand} {item.model}</Text>
                <View style={styles.vehicleMeta}>
                    <View style={styles.vehicleTag}>
                        <Text style={styles.vehicleTagText}>{item.registration}</Text>
                    </View>
                    {!!item.year && (
                        <View style={styles.vehicleTag}>
                            <Text style={styles.vehicleTagText}>{item.year}</Text>
                        </View>
                    )}
                    {!!item.color && (
                        <View style={styles.vehicleTag}>
                            <Text style={styles.vehicleTagText}>{item.color}</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.vehicleActions}>
                <TouchableOpacity
                    style={styles.vehicleActionBtn}
                    onPress={() => openEdit(item)}
                >
                    <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.vehicleActionBtn}
                    onPress={() => handleDelete(item)}
                >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Vehicles</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                    <Ionicons name="add" size={22} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* ── List ────────────────────────────────────────────────────── */}
            {loading ? (
                <ActivityIndicator
                    size="large"
                    color={Colors.primary}
                    style={{ marginTop: 60 }}
                />
            ) : (
                <FlatList
                    data={vehicles}
                    keyExtractor={(v) => String(v.id)}
                    renderItem={renderVehicle}
                    contentContainerStyle={styles.list}
                    onRefresh={load}
                    refreshing={loading}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="car-sport-outline" size={56} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>No vehicles added</Text>
                            <Text style={styles.emptyDesc}>
                                Add your bike or scooty to book faster.
                            </Text>
                            <TouchableOpacity style={styles.addFirstBtn} onPress={openAdd}>
                                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                                <Text style={styles.addFirstBtnText}>Add Vehicle</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            {vehicles.length > 0 && (
                <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
                    <Ionicons name="add" size={26} color="#fff" />
                </TouchableOpacity>
            )}

            {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
            <Modal
                visible={showModal}
                transparent
                animationType="fade"
                onRequestClose={closeModal}
            >
                <Pressable style={styles.modalOverlay} onPress={closeModal} />
                <Animated.View style={[styles.modalSheet, {
                    transform: [{
                        translateY: slideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [700, 0],
                        }),
                    }],
                }]}>
                    <View style={styles.modalHandle} />

                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {editTarget ? 'Edit Vehicle' : 'Add Vehicle'}
                        </Text>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal}>
                            <Ionicons name="close" size={20} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.modalContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Type toggle */}
                        <View style={styles.typeToggle}>
                            {(['bike', 'scooty'] as VehicleType[]).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                                    onPress={() => { setType(t); setBrand(''); }}
                                >
                                    <Ionicons
                                        name={t === 'bike' ? 'bicycle-outline' : 'speedometer-outline'}
                                        size={18}
                                        color={type === t ? Colors.primary : Colors.textTertiary}
                                    />
                                    <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                                        {t === 'bike' ? 'Bike' : 'Scooty'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Brand chips */}
                        <Text style={styles.fieldLabel}>
                            Brand <Text style={styles.required}>*</Text>
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.brandScroll}
                        >
                            {VEHICLE_BRANDS[type].map((b) => (
                                <TouchableOpacity
                                    key={b}
                                    style={[styles.brandChip, brand === b && styles.brandChipActive]}
                                    onPress={() => setBrand(b)}
                                >
                                    <Text style={[styles.brandChipText, brand === b && styles.brandChipTextActive]}>
                                        {b}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Model */}
                        <Text style={styles.fieldLabel}>
                            Model <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Splendor Plus, Activa 6G"
                            placeholderTextColor={Colors.textTertiary}
                            value={model}
                            onChangeText={setModel}
                        />

                        {/* Year */}
                        <Text style={styles.fieldLabel}>Year</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 2022"
                            placeholderTextColor={Colors.textTertiary}
                            value={year}
                            onChangeText={setYear}
                            keyboardType="numeric"
                            maxLength={4}
                        />

                        {/* Registration */}
                        <Text style={styles.fieldLabel}>
                            Registration Number <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. MH31AB1234"
                            placeholderTextColor={Colors.textTertiary}
                            value={registration}
                            onChangeText={setRegistration}
                            autoCapitalize="characters"
                        />

                        {/* Color */}
                        <Text style={styles.fieldLabel}>Color</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Black, Red, Blue"
                            placeholderTextColor={Colors.textTertiary}
                            value={color}
                            onChangeText={setColor}
                        />

                        {/* Save button */}
                        <TouchableOpacity
                            style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
                            onPress={handleSave}
                            disabled={submitting}
                            activeOpacity={0.85}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                                    <Text style={styles.saveBtnText}>
                                        {editTarget ? 'Update Vehicle' : 'Add Vehicle'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </Modal>

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
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 56, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    backBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },
    addBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

    list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },

    vehicleCard: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
    },
    vehicleIconBox: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    vehicleInfo: { flex: 1 },
    vehicleName: { ...Typography.h3, color: Colors.textPrimary },
    vehicleMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
    vehicleTag: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border },
    vehicleTagText: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600' },
    vehicleActions: { flexDirection: 'row', gap: Spacing.xs },
    vehicleActionBtn: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },

    empty: { alignItems: 'center', marginTop: 80, gap: Spacing.sm, paddingHorizontal: Spacing.xl },
    emptyTitle: { ...Typography.h2, color: Colors.textSecondary },
    emptyDesc: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },
    addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radius.full, marginTop: Spacing.sm },
    addFirstBtnText: { ...Typography.body, color: '#fff', fontWeight: '700' },

    fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', position: 'absolute', bottom: 0, left: 0, right: 0 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginTop: Spacing.sm },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    modalTitle: { ...Typography.h2, color: Colors.textPrimary },
    modalCloseBtn: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    modalContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 40 },

    typeToggle: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: 4 },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: Radius.md },
    typeBtnActive: { backgroundColor: Colors.surface, ...Shadow.sm },
    typeBtnText: { ...Typography.body, color: Colors.textTertiary, fontWeight: '600' },
    typeBtnTextActive: { color: Colors.primary },

    fieldLabel: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    required: { color: Colors.error },

    brandScroll: { flexGrow: 0 },
    brandChip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt, marginRight: Spacing.xs },
    brandChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    brandChipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
    brandChipTextActive: { color: Colors.primary },

    input: {
        ...Typography.body, color: Colors.textPrimary,
        backgroundColor: Colors.bg, borderRadius: Radius.md,
        paddingHorizontal: Spacing.md, paddingVertical: 13,
        borderWidth: 1, borderColor: Colors.border,
    },

    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.sm },
    saveBtnText: { ...Typography.button, color: '#fff' },
});
