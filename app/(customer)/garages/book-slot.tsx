// app/(customer)/book-slot.tsx

import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, TextInput, Modal, FlatList,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getGarageById } from '../../../utils/services/garageService';
import { getBookedSlots } from '../../../utils/services/bookingService';
import { getAvailableDates, getSlotsForDay } from '../../../utils/helpers/slotGenerator';
import {
    getMyVehicles, addVehicle, deleteVehicle,
    Vehicle, VehiclePayload, VehicleType as VType,
} from '../../../utils/services/vehicleService';
import { Garage, DaySchedule } from '../../../types';
import Toast from '../../../components/Toast';
import { useToast } from '../../../hooks/useToast';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';
import { useCart } from '../../../context/CartContext';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useUIStore } from '../../../store/uiStore';

type BookingVehicleType = 'bike' | 'scooty';
type AvailableDate = { date: string; label: string; weekday: string };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function toHHMM(slot: string): string {
    const [timePart, period] = slot.split(' ');
    const [hStr, mStr] = timePart.split(':');
    let hours = parseInt(hStr, 10);
    const mins = mStr ?? '00';
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours.toString().padStart(2, '0') + ':' + mins;  // ✅ Add ':'
}

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

function vehicleDisplayName(v: Vehicle): string {
    return v.brand + ' ' + v.model + (v.year ? '  ·  ' + v.year : '');
}

function vehicleSubDetail(v: Vehicle): string {
    const parts: string[] = [];
    if (v.registration) parts.push(v.registration.toUpperCase());
    if (v.color) parts.push(v.color);
    return parts.join('  ·  ');
}

function calcTotal(selected: string[], prices: Record<string, number>): number {
    if (selected.includes('Complete Servicing') && prices['Complete Servicing'])
        return prices['Complete Servicing'];
    return selected.reduce((sum, svc) => sum + (prices[svc] ?? 0), 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Picker Modal
// ─────────────────────────────────────────────────────────────────────────────
type VehiclePickerModalProps = {
    visible: boolean;
    vehicles: Vehicle[];
    selectedId: number | null;
    loading: boolean;
    onSelect: (v: Vehicle) => void;
    onAdd: (payload: VehiclePayload) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    onClose: () => void;
};

function VehiclePickerModal({
    visible, vehicles, selectedId, loading,
    onSelect, onAdd, onDelete, onClose,
}: VehiclePickerModalProps) {
    const [view, setView] = useState<'list' | 'add'>('list');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    // ── Add-form fields matching VehiclePayload exactly ──────────────────────
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [type, setType] = useState<VType>('bike');
    const [year, setYear] = useState('');
    const [registration, setRegistration] = useState('');
    const [color, setColor] = useState('');

    useEffect(() => {
        if (visible) { setView('list'); resetForm(); }
    }, [visible]);

    const resetForm = () => {
        setBrand(''); setModel(''); setType('bike');
        setYear(''); setRegistration(''); setColor('');
    };

    const isFormValid = brand.trim() !== '' && model.trim() !== '';

    const handleSave = async () => {
        if (!isFormValid) return;
        setSaving(true);
        await onAdd({
            type,
            brand: brand.trim(),
            model: model.trim(),
            year: year.trim(),
            registration: registration.trim(),
            color: color.trim(),
        });
        setSaving(false);
        resetForm();
        setView('list');
    };

    const handleDelete = async (id: number) => {
        setDeleting(id);
        await onDelete(id);
        setDeleting(null);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={vpStyles.backdrop}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={vpStyles.sheet}
                >
                    {/* ── Header ─────────────────────────────────────────── */}
                    <View style={vpStyles.header}>
                        {view === 'add' ? (
                            <TouchableOpacity style={vpStyles.iconBtn} onPress={() => setView('list')}>
                                <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        ) : (
                            <View style={vpStyles.headerIcon}>
                                <Ionicons name="car-sport-outline" size={18} color={Colors.primary} />
                            </View>
                        )}
                        <Text style={vpStyles.headerTitle}>
                            {view === 'add' ? 'Add New Vehicle' : 'Select Vehicle'}
                        </Text>
                        <TouchableOpacity style={vpStyles.iconBtn} onPress={onClose}>
                            <Ionicons name="close" size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* ── LIST view ──────────────────────────────────────── */}
                    {view === 'list' && (
                        <>
                            {loading ? (
                                <View style={vpStyles.centeredBox}>
                                    <ActivityIndicator color={Colors.primary} />
                                </View>
                            ) : vehicles.length === 0 ? (
                                <View style={vpStyles.centeredBox}>
                                    <View style={vpStyles.emptyIllustration}>
                                        <Ionicons name="bicycle-outline" size={38} color={Colors.textTertiary} />
                                    </View>
                                    <Text style={vpStyles.emptyTitle}>{'No vehicles saved yet'}</Text>
                                    <Text style={vpStyles.emptySubtitle}>
                                        {'Add your bike or scooty to book faster next time.'}
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={vehicles}
                                    keyExtractor={(v) => String(v.id)}
                                    style={vpStyles.list}
                                    showsVerticalScrollIndicator={false}
                                    ItemSeparatorComponent={() => <View style={vpStyles.separator} />}
                                    renderItem={({ item: v }) => {
                                        const isSelected = selectedId === v.id;
                                        const isBike = v.type === 'bike';
                                        return (
                                            <TouchableOpacity
                                                style={[vpStyles.vehicleRow, isSelected && vpStyles.vehicleRowActive]}
                                                onPress={() => { onSelect(v); onClose(); }}
                                                activeOpacity={0.75}
                                            >
                                                {/* Type icon */}
                                                <View style={[
                                                    vpStyles.typeIcon,
                                                    isBike ? vpStyles.typeIconBike : vpStyles.typeIconScooty,
                                                ]}>
                                                    <Ionicons
                                                        name={isBike ? 'bicycle-outline' : 'speedometer-outline'}
                                                        size={22}
                                                        color={isBike ? Colors.info : '#6D28D9'}
                                                    />
                                                </View>

                                                {/* Info */}
                                                <View style={vpStyles.vehicleInfo}>
                                                    <Text style={[vpStyles.vehicleName, isSelected && vpStyles.vehicleNameActive]}>
                                                        {vehicleDisplayName(v)}
                                                    </Text>
                                                    {vehicleSubDetail(v) !== '' && (
                                                        <Text style={vpStyles.vehicleSub}>{vehicleSubDetail(v)}</Text>
                                                    )}
                                                    <View style={[
                                                        vpStyles.typeBadge,
                                                        isBike ? vpStyles.typeBadgeBike : vpStyles.typeBadgeScooty,
                                                    ]}>
                                                        <Text style={[
                                                            vpStyles.typeBadgeText,
                                                            { color: isBike ? Colors.info : '#6D28D9' },
                                                        ]}>
                                                            {isBike ? 'Bike' : 'Scooty'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Right action */}
                                                {isSelected ? (
                                                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                                                ) : (
                                                    <TouchableOpacity
                                                        style={vpStyles.deleteBtn}
                                                        onPress={() => handleDelete(v.id)}
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    >
                                                        {deleting === v.id
                                                            ? <ActivityIndicator size="small" color={Colors.error} />
                                                            : <Ionicons name="trash-outline" size={17} color={Colors.error} />
                                                        }
                                                    </TouchableOpacity>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            )}

                            {/* Add vehicle CTA */}
                            <View style={vpStyles.footer}>
                                <TouchableOpacity
                                    style={vpStyles.addVehicleBtn}
                                    onPress={() => setView('add')}
                                    activeOpacity={0.85}
                                >
                                    <View style={vpStyles.addVehicleBtnIcon}>
                                        <Ionicons name="add" size={20} color={Colors.primary} />
                                    </View>
                                    <Text style={vpStyles.addVehicleBtnText}>{'Add New Vehicle'}</Text>
                                    <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* ── ADD FORM view ───────────────────────────────────── */}
                    {view === 'add' && (
                        <ScrollView
                            style={vpStyles.addForm}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Vehicle Type */}
                            <Text style={vpStyles.fieldLabel}>{'VEHICLE TYPE *'}</Text>
                            <View style={vpStyles.typeToggle}>
                                {(['bike', 'scooty'] as VType[]).map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[vpStyles.typeBtn, type === t && vpStyles.typeBtnActive]}
                                        onPress={() => setType(t)}
                                        activeOpacity={0.75}
                                    >
                                        <Ionicons
                                            name={t === 'bike' ? 'bicycle-outline' : 'speedometer-outline'}
                                            size={18}
                                            color={type === t ? Colors.primary : Colors.textTertiary}
                                        />
                                        <Text style={[vpStyles.typeBtnText, type === t && vpStyles.typeBtnTextActive]}>
                                            {t === 'bike' ? 'Bike' : 'Scooty'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Brand */}
                            <Text style={vpStyles.fieldLabel}>{'BRAND *'}</Text>
                            <View style={vpStyles.fieldRow}>
                                <Ionicons name="business-outline" size={17} color={Colors.textTertiary} />
                                <TextInput
                                    style={vpStyles.fieldInput}
                                    placeholder="e.g. Honda, Hero, TVS, Yamaha"
                                    placeholderTextColor={Colors.textTertiary}
                                    value={brand}
                                    onChangeText={setBrand}
                                    autoCapitalize="words"
                                />
                            </View>

                            {/* Model */}
                            <Text style={vpStyles.fieldLabel}>{'MODEL *'}</Text>
                            <View style={vpStyles.fieldRow}>
                                <Ionicons name={type === 'bike' ? 'bicycle-outline' : 'speedometer-outline'} size={17} color={Colors.textTertiary} />
                                <TextInput
                                    style={vpStyles.fieldInput}
                                    placeholder="e.g. CB Shine, Activa 6G, FZ-S"
                                    placeholderTextColor={Colors.textTertiary}
                                    value={model}
                                    onChangeText={setModel}
                                    autoCapitalize="words"
                                />
                            </View>

                            {/* Registration */}
                            <Text style={vpStyles.fieldLabel}>{'REGISTRATION NUMBER'}</Text>
                            <View style={vpStyles.fieldRow}>
                                <Ionicons name="card-outline" size={17} color={Colors.textTertiary} />
                                <TextInput
                                    style={vpStyles.fieldInput}
                                    placeholder="e.g. MH12AB1234"
                                    placeholderTextColor={Colors.textTertiary}
                                    value={registration}
                                    onChangeText={(t) => setRegistration(t.toUpperCase())}
                                    autoCapitalize="characters"
                                />
                            </View>

                            {/* Year + Color side by side */}
                            <View style={vpStyles.halfRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={vpStyles.fieldLabel}>{'YEAR'}</Text>
                                    <View style={vpStyles.fieldRow}>
                                        <Ionicons name="calendar-outline" size={17} color={Colors.textTertiary} />
                                        <TextInput
                                            style={vpStyles.fieldInput}
                                            placeholder="2022"
                                            placeholderTextColor={Colors.textTertiary}
                                            value={year}
                                            onChangeText={setYear}
                                            keyboardType="number-pad"
                                            maxLength={4}
                                        />
                                    </View>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={vpStyles.fieldLabel}>{'COLOR'}</Text>
                                    <View style={vpStyles.fieldRow}>
                                        <Ionicons name="color-palette-outline" size={17} color={Colors.textTertiary} />
                                        <TextInput
                                            style={vpStyles.fieldInput}
                                            placeholder="Black, Red..."
                                            placeholderTextColor={Colors.textTertiary}
                                            value={color}
                                            onChangeText={setColor}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Save */}
                            <TouchableOpacity
                                style={[vpStyles.saveBtn, (!isFormValid || saving) && vpStyles.saveBtnDisabled]}
                                onPress={handleSave}
                                disabled={!isFormValid || saving}
                                activeOpacity={0.85}
                            >
                                {saving
                                    ? <ActivityIndicator color="#fff" />
                                    : <>
                                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                        <Text style={vpStyles.saveBtnText}>{'Save Vehicle'}</Text>
                                    </>
                                }
                            </TouchableOpacity>
                            <View style={{ height: 32 }} />
                        </ScrollView>
                    )}
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const vpStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', ...Shadow.lg },

    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    headerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary, flex: 1 },
    iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },

    list: { maxHeight: 360 },
    separator: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.md },

    centeredBox: { alignItems: 'center', paddingVertical: 36, gap: Spacing.sm, paddingHorizontal: Spacing.lg },
    emptyIllustration: { width: 68, height: 68, borderRadius: 34, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
    emptyTitle: { ...Typography.h3, color: Colors.textPrimary },
    emptySubtitle: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center', maxWidth: 260 },

    vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
    vehicleRowActive: { backgroundColor: Colors.primaryLight },
    typeIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    typeIconBike: { backgroundColor: Colors.infoLight },
    typeIconScooty: { backgroundColor: '#F5F3FF' },
    vehicleInfo: { flex: 1, gap: 3 },
    vehicleName: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700' },
    vehicleNameActive: { color: Colors.primary },
    vehicleSub: { ...Typography.caption, color: Colors.textTertiary },
    typeBadge: { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 },
    typeBadgeBike: { backgroundColor: Colors.infoLight },
    typeBadgeScooty: { backgroundColor: '#F5F3FF' },
    typeBadgeText: { fontSize: 10, fontWeight: '700' },
    deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },

    footer: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
    addVehicleBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primaryLight, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary },
    addVehicleBtnIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary },
    addVehicleBtnText: { ...Typography.body, color: Colors.primary, fontWeight: '700', flex: 1 },

    // Add form
    addForm: { padding: Spacing.md },
    fieldLabel: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '800', letterSpacing: 0.8, marginTop: Spacing.md, marginBottom: 6 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bg, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
    fieldInput: { ...Typography.body, flex: 1, color: Colors.textPrimary },
    halfRow: { flexDirection: 'row', gap: Spacing.sm },

    typeToggle: { flexDirection: 'row', gap: Spacing.sm },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
    typeBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    typeBtnText: { ...Typography.body, color: Colors.textTertiary, fontWeight: '600' },
    typeBtnTextActive: { color: Colors.primary },

    saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.lg ?? 24 },
    saveBtnDisabled: { opacity: 0.45 },
    saveBtnText: { ...Typography.button, color: '#fff' },
});

// ─────────────────────────────────────────────────────────────────────────────
// ServiceRow (with price badge)
// ─────────────────────────────────────────────────────────────────────────────
function ServiceRow({ name, selected, price, onToggle, isComplete }: {
    name: string; selected: boolean; price: number | null;
    onToggle: () => void; isComplete?: boolean;
}) {
    return (
        <TouchableOpacity
            style={[svcStyles.row, selected && svcStyles.rowActive, isComplete && svcStyles.rowComplete]}
            onPress={onToggle}
            activeOpacity={0.75}
        >
            <View style={[svcStyles.checkbox, selected && svcStyles.checkboxActive]}>
                {selected ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
            </View>
            <View style={svcStyles.textWrap}>
                <Text style={[svcStyles.name, selected && svcStyles.nameActive, isComplete && svcStyles.nameComplete]}>
                    {name}
                </Text>
                {isComplete ? <Text style={svcStyles.sub}>{'Includes all available services'}</Text> : null}
            </View>
            <View style={[svcStyles.priceBadge, selected && svcStyles.priceBadgeActive, isComplete && svcStyles.priceBadgeComplete]}>
                <Text style={[svcStyles.priceText, selected && svcStyles.priceTextActive, isComplete && svcStyles.priceTextComplete]}>
                    {price != null && price > 0 ? '₹' + price.toLocaleString('en-IN') : 'Free est.'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}
const svcStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
    rowActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    rowComplete: { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    textWrap: { flex: 1 },
    name: { ...Typography.body, color: Colors.textSecondary, fontWeight: '500' },
    nameActive: { color: Colors.primary, fontWeight: '700' },
    nameComplete: { color: '#92400E', fontWeight: '700' },
    sub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
    priceBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
    priceBadgeActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
    priceBadgeComplete: { backgroundColor: '#FDE68A', borderColor: '#F59E0B' },
    priceText: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '700' },
    priceTextActive: { color: Colors.primary },
    priceTextComplete: { color: '#92400E' },
});

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({ step, title, currentStep, icon, locked = false, children }: {
    step: number; title: string; currentStep: number;
    icon: any; locked?: boolean; children: React.ReactNode;
}) {
    const done = currentStep > step;
    const active = currentStep === step;
    return (
        <View style={[secStyles.card, locked && secStyles.cardLocked]}>
            <View style={secStyles.titleRow}>
                <View style={[secStyles.stepBadge, done && secStyles.stepBadgeDone, active && secStyles.stepBadgeActive]}>
                    {done
                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                        : <Ionicons name={icon} size={14} color={active ? '#fff' : Colors.textTertiary} />
                    }
                </View>
                <Text style={[secStyles.title, locked && secStyles.titleLocked]}>{title}</Text>
                {locked ? <Ionicons name="lock-closed-outline" size={14} color={Colors.textTertiary} /> : null}
            </View>
            {!locked && <View style={secStyles.body}>{children}</View>}
        </View>
    );
}
const secStyles = StyleSheet.create({
    card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm },
    cardLocked: { opacity: 0.5 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
    stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
    stepBadgeDone: { backgroundColor: Colors.success, borderColor: Colors.success },
    stepBadgeActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    title: { ...Typography.h3, color: Colors.textPrimary, flex: 1 },
    titleLocked: { color: Colors.textTertiary },
    body: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function BookSlotScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { toast, showToast, hideToast } = useToast();

    const [garage, setGarage] = useState<Garage | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // ── Vehicle ───────────────────────────────────────────────────────────────
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [vehiclesLoading, setVehiclesLoading] = useState(true);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);

    // vehicleType & bikeDetails used for booking payload
    const [vehicleType, setVehicleType] = useState<BookingVehicleType>('bike');
    const [bikeDetails, setBikeDetails] = useState('');

    // ── Booking ───────────────────────────────────────────────────────────────
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    const [addingToCart, setAddingToCart] = useState(false);
    const { bookSlotShouldReset, setBookSlotShouldReset } = useUIStore();

    const { addItem } = useCart();

    // Step — vehicle ready when either a saved vehicle is selected OR manual details typed
    const vehicleReady = selectedVehicle !== null || bikeDetails.trim().length > 0;
    const step = selectedServices.length === 0 || !vehicleReady ? 1
        : !selectedDate ? 2
            : !selectedSlot ? 3
                : 4;

    // ── Pricing ───────────────────────────────────────────────────────────────
    const prices = garage?.service_prices?.[vehicleType] ?? {};
    const services = garage?.services?.[vehicleType] ?? [];
    const estimatedTotal = calcTotal(selectedServices, prices);

    // ── Load ──────────────────────────────────────────────────────────────────
    // ✅ Restore these — run only on mount, state survives back-navigation
    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getGarageById(id)
            .then((g) => {
                setGarage(g);
                setAvailableDates(getAvailableDates(g.schedule ?? [], 14));
            })
            .catch((e: any) =>
                showToast(e?.response?.data?.detail ?? 'Failed to load garage.', 'error')
            )
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        setVehiclesLoading(true);
        getMyVehicles()
            .then(setVehicles)
            .catch(() => { })
            .finally(() => setVehiclesLoading(false));
    }, []);

    // ── Reset only when booking was just completed ────────────────────────────
    useFocusEffect(
        useCallback(() => {
            if (!bookSlotShouldReset) return;   // ← back from cart? do nothing

            // Reset all form state
            setSelectedVehicle(null);
            setVehicleType('bike');
            setBikeDetails('');
            setSelectedServices([]);
            setSelectedDate(null);
            setAvailableSlots([]);
            setSelectedSlot(null);
            setBookedSlots([]);

            setBookSlotShouldReset(false);      // ← clear flag so it doesn't reset again
        }, [bookSlotShouldReset])
    );

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSelectVehicle = (v: Vehicle) => {
        setSelectedVehicle(v);
        setVehicleType(v.type as BookingVehicleType);
        // Auto-fill bikeDetails from the vehicle profile
        const detail = v.brand + ' ' + v.model + (v.year ? ' ' + v.year : '') + (v.registration ? ' (' + v.registration.toUpperCase() + ')' : '');
        setBikeDetails(detail);
        // Reset downstream selections when vehicle/type changes
        setSelectedServices([]);
        setSelectedDate(null);
        setSelectedSlot(null);
        setAvailableSlots([]);
    };

    const handleVehicleTypeToggle = (t: BookingVehicleType) => {
        setVehicleType(t);
        setSelectedVehicle(null);
        setBikeDetails('');
        setSelectedServices([]);
        setSelectedDate(null);
        setSelectedSlot(null);
        setAvailableSlots([]);
    };

    const handleAddVehicle = async (payload: VehiclePayload) => {
        try {
            const created = await addVehicle(payload);
            setVehicles((prev) => [created, ...prev]);
            handleSelectVehicle(created); // auto-select newly added vehicle
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Failed to save vehicle.', 'error');
            throw e;
        }
    };

    const handleDeleteVehicle = async (vid: number) => {
        try {
            await deleteVehicle(vid);
            setVehicles((prev) => prev.filter((v) => v.id !== vid));
            if (selectedVehicle?.id === vid) { setSelectedVehicle(null); setBikeDetails(''); }
        } catch {
            showToast('Failed to delete vehicle.', 'error');
        }
    };

    const toggleService = (svc: string) =>
        setSelectedServices((prev) =>
            prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
        );

    const toggleCompleteServicing = () => {
        const all = [...services, 'Complete Servicing'];
        const allSel = all.every((s) => selectedServices.includes(s));
        setSelectedServices(allSel ? [] : all);
    };

    const handleDateSelect = async (item: AvailableDate) => {
        setSelectedDate(item.date);
        setSelectedSlot(null);
        setBookedSlots([]);
        const schedule = (garage?.schedule ?? []) as DaySchedule[];
        const dayConfig = schedule.find((s) => s.day === item.weekday);
        const slots = dayConfig ? getSlotsForDay(dayConfig) : [];
        setAvailableSlots(slots);
        if (garage?.id && slots.length > 0) {
            setLoadingSlots(true);
            try {
                const taken = await getBookedSlots(String(garage.id), item.date);
                setBookedSlots(taken.map(formatDisplayTime));
            } catch { /* non-critical */ }
            finally { setLoadingSlots(false); }
        }
    };

    const handleAddToCart = async () => {
        if (selectedServices.length === 0 || !vehicleReady || !selectedDate || !selectedSlot) {
            showToast('Please complete all steps before adding to cart.', 'warning');
            return;
        }
        setAddingToCart(true);
        try {
            await addItem({
                garageId: String(garage!.id),
                garageName: garage!.name,
                garageAddress: garage!.address,
                vehicleType: vehicleType,
                vehicleBrand: selectedVehicle?.brand ?? '',
                vehicleModel: selectedVehicle?.model ?? bikeDetails.trim(),
                vehicleReg: selectedVehicle?.registration ?? '',
                bikeDetails: bikeDetails.trim(),
                services: selectedServices,
                date: selectedDate,
                dateLabel: availableDates.find((d) => d.date === selectedDate)?.label ?? selectedDate,
                timeDisplay: selectedSlot,
                timeRaw: toHHMM(selectedSlot),
                estimatedPrice: estimatedTotal,
            });
            showToast('Added to cart!', 'success');
            setTimeout(() => router.replace('/(customer)/cart' as any), 800);
        } catch {
            showToast('Failed to add to cart. Please try again.', 'error');
        } finally {
            setAddingToCart(false);
        }
    };

    // ── Guards ────────────────────────────────────────────────────────────────
    if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />;
    if (!garage) return (
        <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <Text style={styles.errorText}>{'Garage not found.'}</Text>
        </View>
    );

    return (
        <View style={styles.root}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.push({ pathname: '/(customer)/garages/garage-detail', params: { id: String(garage.id) } } as any)}
                    activeOpacity={0.88}
                >
                    <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{'Book a Slot'}</Text>
                    <Text style={styles.headerSub} numberOfLines={1}>{garage.name}</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            {/* Progress */}
            <View style={styles.progressWrap}>
                {['Service', 'Date', 'Time', 'Confirm'].map((label, i) => {
                    const s = i + 1; const done = step > s; const active = step === s;
                    return (
                        <React.Fragment key={label}>
                            <View style={styles.progressStep}>
                                <View style={[styles.progressDot, done && styles.progressDotDone, active && styles.progressDotActive]}>
                                    {done
                                        ? <Ionicons name="checkmark" size={10} color="#fff" />
                                        : <Text style={[styles.progressDotText, (active || done) && { color: '#fff' }]}>{String(s)}</Text>
                                    }
                                </View>
                                <Text style={[styles.progressLabel, (done || active) && styles.progressLabelActive]}>{label}</Text>
                            </View>
                            {i < 3 && <View style={[styles.progressLine, done && styles.progressLineDone]} />}
                        </React.Fragment>
                    );
                })}
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* ════════════════════════════════════════════════════════ */}
                {/*  STEP 1 — Vehicle + Service                              */}
                {/* ════════════════════════════════════════════════════════ */}
                <SectionCard step={1} title="Select Service" currentStep={step} icon="construct-outline">

                    {/* ── Vehicle picker ─────────────────────────────── */}
                    <Text style={styles.subLabel}>{'YOUR VEHICLE'}</Text>

                    {selectedVehicle ? (
                        /* ── Selected vehicle card ── */
                        <TouchableOpacity
                            style={styles.selectedVehicleCard}
                            onPress={() => setVehiclePickerOpen(true)}
                            activeOpacity={0.85}
                        >
                            <View style={[
                                styles.selectedVehicleIcon,
                                selectedVehicle.type === 'bike' ? styles.iconBike : styles.iconScooty,
                            ]}>
                                <Ionicons
                                    name={selectedVehicle.type === 'bike' ? 'bicycle-outline' : 'speedometer-outline'}
                                    size={22}
                                    color={selectedVehicle.type === 'bike' ? Colors.info : '#6D28D9'}
                                />
                            </View>
                            <View style={styles.selectedVehicleInfo}>
                                <Text style={styles.selectedVehicleName}>{vehicleDisplayName(selectedVehicle)}</Text>
                                {vehicleSubDetail(selectedVehicle) !== '' && (
                                    <Text style={styles.selectedVehicleSub}>{vehicleSubDetail(selectedVehicle)}</Text>
                                )}
                            </View>
                            <View style={styles.changeBtn}>
                                <Text style={styles.changeBtnText}>{'Change'}</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        /* ── Picker trigger (no vehicle selected yet) ── */
                        <TouchableOpacity
                            style={styles.pickerTrigger}
                            onPress={() => setVehiclePickerOpen(true)}
                            activeOpacity={0.85}
                        >
                            {vehiclesLoading ? (
                                <ActivityIndicator size="small" color={Colors.primary} />
                            ) : (
                                <View style={styles.pickerTriggerIcon}>
                                    <Ionicons name="car-sport-outline" size={20} color={Colors.primary} />
                                </View>
                            )}
                            <View style={styles.pickerTriggerText}>
                                <Text style={styles.pickerTriggerTitle}>
                                    {vehicles.length > 0 ? 'Select a saved vehicle' : 'Add your vehicle'}
                                </Text>
                                <Text style={styles.pickerTriggerSub}>
                                    {vehicles.length > 0
                                        ? String(vehicles.length) + ' vehicle' + (vehicles.length !== 1 ? 's' : '') + ' saved'
                                        : 'Save it once, book faster every time'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                        </TouchableOpacity>
                    )}

                    {/* Manual fallback — shown only when no saved vehicle selected */}
                    {!selectedVehicle && (
                        <>
                            <View style={styles.orRow}>
                                <View style={styles.orLine} />
                                <Text style={styles.orText}>{'or type manually'}</Text>
                                <View style={styles.orLine} />
                            </View>

                            <View style={styles.vehicleToggle}>
                                {(['bike', 'scooty'] as BookingVehicleType[]).map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.vehicleBtn, vehicleType === t && styles.vehicleBtnActive]}
                                        onPress={() => handleVehicleTypeToggle(t)}
                                    >
                                        <Ionicons
                                            name={t === 'bike' ? 'bicycle-outline' : 'speedometer-outline'}
                                            size={18}
                                            color={vehicleType === t ? Colors.primary : Colors.textTertiary}
                                        />
                                        <Text style={[styles.vehicleBtnText, vehicleType === t && styles.vehicleBtnTextActive]}>
                                            {t === 'bike' ? 'Bike' : 'Scooty'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.fieldRow}>
                                <Ionicons
                                    name={vehicleType === 'bike' ? 'bicycle-outline' : 'speedometer-outline'}
                                    size={18}
                                    color={Colors.textTertiary}
                                />
                                <TextInput
                                    style={styles.fieldInput}
                                    placeholder={vehicleType === 'bike' ? 'e.g. Honda CB Shine, Hero Splendor...' : 'e.g. Honda Activa, TVS Jupiter...'}
                                    placeholderTextColor={Colors.textTertiary}
                                    value={bikeDetails}
                                    onChangeText={setBikeDetails}
                                    autoCapitalize="words"
                                />
                            </View>
                        </>
                    )}

                    {/* ── Service selection ──────────────────────────── */}
                    <Text style={styles.subLabel}>{'SERVICES'}</Text>

                    <ServiceRow
                        name="Complete Servicing"
                        selected={services.length > 0 && services.every((s) => selectedServices.includes(s)) && selectedServices.includes('Complete Servicing')}
                        price={prices['Complete Servicing'] ?? null}
                        onToggle={toggleCompleteServicing}
                        isComplete
                    />

                    {services.length > 0 && (
                        <View style={styles.orRow}>
                            <View style={styles.orLine} />
                            <Text style={styles.orText}>{'or pick individual'}</Text>
                            <View style={styles.orLine} />
                        </View>
                    )}

                    {services.length === 0 ? (
                        <View style={styles.emptyServices}>
                            <Ionicons name="alert-circle-outline" size={22} color={Colors.textTertiary} />
                            <Text style={styles.emptyServicesText}>
                                {'No ' + vehicleType + ' services at this garage.'}
                            </Text>
                        </View>
                    ) : (
                        services.map((svc) => (
                            <ServiceRow
                                key={svc}
                                name={svc}
                                selected={selectedServices.includes(svc)}
                                price={prices[svc] ?? null}
                                onToggle={() => toggleService(svc)}
                            />
                        ))
                    )}

                    {selectedServices.length > 0 && (
                        <View style={styles.selectedSummaryRow}>
                            <View style={styles.selectedLeft}>
                                <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                                <Text style={styles.selectedCountText}>
                                    {String(selectedServices.length) + ' service' + (selectedServices.length !== 1 ? 's' : '') + ' selected'}
                                </Text>
                            </View>
                            <View style={styles.selectedRight}>
                                {estimatedTotal > 0 && (
                                    <Text style={styles.estimatedPrice}>
                                        {'~ ₹' + estimatedTotal.toLocaleString('en-IN')}
                                    </Text>
                                )}
                                <TouchableOpacity onPress={() => setSelectedServices([])}>
                                    <Text style={styles.clearText}>{'Clear'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </SectionCard>

                {/* ════════════════════════════════════════════════════════ */}
                {/*  STEP 2 — Date                                           */}
                {/* ════════════════════════════════════════════════════════ */}
                <SectionCard step={2} title="Select Date" currentStep={step} icon="calendar-outline" locked={step < 2}>
                    {availableDates.length === 0 ? (
                        <View style={styles.emptyServices}>
                            <Ionicons name="calendar-outline" size={22} color={Colors.textTertiary} />
                            <Text style={styles.emptyServicesText}>{'No available dates. Garage may not have set a schedule.'}</Text>
                        </View>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.dateRow}>
                                {availableDates.map((item) => {
                                    const active = selectedDate === item.date;
                                    const [weekdayShort, dayMonth] = item.label.split(', ');
                                    return (
                                        <TouchableOpacity
                                            key={item.date}
                                            style={[styles.dateCard, active && styles.dateCardActive]}
                                            onPress={() => handleDateSelect(item)}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[styles.dateCardDay, active && styles.dateCardTextActive]}>{weekdayShort}</Text>
                                            <Text style={[styles.dateCardNum, active && styles.dateCardTextActive]}>{dayMonth}</Text>
                                            {active && <View style={styles.dateCardDot} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    )}
                </SectionCard>

                {/* ════════════════════════════════════════════════════════ */}
                {/*  STEP 3 — Time Slot                                      */}
                {/* ════════════════════════════════════════════════════════ */}
                <SectionCard step={3} title="Select Time Slot" currentStep={step} icon="time-outline" locked={step < 3}>
                    {loadingSlots ? (
                        <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
                    ) : availableSlots.length === 0 ? (
                        <View style={styles.emptyServices}>
                            <Ionicons name="time-outline" size={22} color={Colors.textTertiary} />
                            <Text style={styles.emptyServicesText}>{'No slots available for this day.'}</Text>
                        </View>
                    ) : (
                        <>
                            {bookedSlots.length > 0 && (
                                <View style={styles.bookedHint}>
                                    <Ionicons name="information-circle-outline" size={14} color={Colors.textTertiary} />
                                    <Text style={styles.bookedHintText}>
                                        {String(bookedSlots.length) + ' slot' + (bookedSlots.length !== 1 ? 's' : '') + ' already booked'}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.slotGrid}>
                                {availableSlots.map((slot) => {
                                    const isBooked = bookedSlots.includes(slot);
                                    const active = selectedSlot === slot;
                                    return (
                                        <TouchableOpacity
                                            key={slot}
                                            style={[styles.slotChip, active && styles.slotChipActive, isBooked && styles.slotChipBooked]}
                                            onPress={() => !isBooked && setSelectedSlot(slot)}
                                            disabled={isBooked}
                                            activeOpacity={isBooked ? 1 : 0.75}
                                        >
                                            <Ionicons
                                                name={isBooked ? 'lock-closed-outline' : 'time-outline'}
                                                size={13}
                                                color={isBooked ? Colors.textTertiary : active ? '#fff' : Colors.textSecondary}
                                            />
                                            <Text style={[styles.slotChipText, active && styles.slotChipTextActive, isBooked && styles.slotChipTextBooked]}>
                                                {slot}
                                            </Text>
                                            {isBooked && <Text style={styles.slotBookedLabel}>{'Booked'}</Text>}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}
                </SectionCard>

                {/* ════════════════════════════════════════════════════════ */}
                {/*  STEP 4 — Summary + Price breakdown                      */}
                {/* ════════════════════════════════════════════════════════ */}
                {step === 4 && selectedServices.length > 0 && selectedDate && selectedSlot && (
                    <SectionCard step={4} title="Booking Summary" currentStep={step} icon="checkmark-circle-outline">
                        <View style={styles.summaryBox}>
                            {[
                                { icon: 'storefront-outline', label: 'Garage', value: garage.name },
                                {
                                    icon: vehicleType === 'bike' ? 'bicycle-outline' : 'speedometer-outline',
                                    label: 'Vehicle', value: (vehicleType === 'bike' ? 'Bike' : 'Scooty') + ' — ' + bikeDetails
                                },
                                { icon: 'calendar-outline', label: 'Date', value: availableDates.find((d) => d.date === selectedDate)?.label ?? selectedDate },
                                { icon: 'time-outline', label: 'Time', value: selectedSlot },
                                { icon: 'location-outline', label: 'Address', value: garage.address },
                            ].map((row, i, arr) => (
                                <View key={row.label}>
                                    <View style={styles.summaryRow}>
                                        <View style={styles.summaryIconBox}>
                                            <Ionicons name={row.icon as any} size={15} color={Colors.primary} />
                                        </View>
                                        <View style={styles.summaryTextWrap}>
                                            <Text style={styles.summaryLabel}>{row.label}</Text>
                                            <Text style={styles.summaryValue}>{row.value}</Text>
                                        </View>
                                    </View>
                                    {i < arr.length - 1 && <View style={styles.divider} />}
                                </View>
                            ))}
                        </View>

                        {/* Price breakdown */}
                        <View style={styles.priceBreakdown}>
                            <Text style={styles.priceBreakdownTitle}>{'PRICE BREAKDOWN'}</Text>
                            {selectedServices.map((svc, idx) => (
                                <View key={svc} style={[styles.priceBreakdownRow, idx === selectedServices.length - 1 && { borderBottomWidth: 0 }]}>
                                    <Text style={styles.priceBreakdownService}>{svc}</Text>
                                    <Text style={styles.priceBreakdownAmount}>
                                        {prices[svc] > 0 ? '₹' + prices[svc].toLocaleString('en-IN') : '—'}
                                    </Text>
                                </View>
                            ))}
                            <View style={styles.priceTotalRow}>
                                <Text style={styles.priceTotalLabel}>{'Estimated Total'}</Text>
                                <Text style={styles.priceTotalValue}>
                                    {estimatedTotal > 0 ? '₹' + estimatedTotal.toLocaleString('en-IN') : 'Price on request'}
                                </Text>
                            </View>
                            <Text style={styles.priceDisclaimer}>{'* Final price confirmed at garage after inspection.'}</Text>
                        </View>
                    </SectionCard>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                {step < 4 ? (
                    <View style={styles.footerHint}>
                        <Ionicons name="information-circle-outline" size={15} color={Colors.textTertiary} />
                        <Text style={styles.footerHintText}>
                            {step === 1 && selectedServices.length === 0 ? 'Pick at least one service to continue'
                                : step === 1 && !vehicleReady ? 'Select or enter your vehicle to continue'
                                    : step === 2 ? 'Pick a date to continue'
                                        : 'Pick a time slot to continue'}
                        </Text>
                    </View>
                ) : (
                    estimatedTotal > 0 && (
                        <View style={styles.footerTotal}>
                            <Text style={styles.footerTotalLabel}>{'Est. Total'}</Text>
                            <Text style={styles.footerTotalValue}>{'₹' + estimatedTotal.toLocaleString('en-IN')}</Text>
                        </View>
                    )
                )}
                <TouchableOpacity
                    style={[styles.confirmBtn, (addingToCart || step < 4) && styles.confirmBtnDisabled]}
                    onPress={handleAddToCart}
                    disabled={addingToCart || step < 4}
                    activeOpacity={0.88}
                >
                    {addingToCart
                        ? <ActivityIndicator color="#fff" />
                        : <>
                            <Ionicons name="cart-outline" size={20} color="#fff" />
                            <Text style={styles.confirmBtnText}>{'Add to Cart'}</Text>
                        </>
                    }
                </TouchableOpacity>
            </View>

            <VehiclePickerModal
                visible={vehiclePickerOpen}
                vehicles={vehicles}
                selectedId={selectedVehicle?.id ?? null}
                loading={vehiclesLoading}
                onSelect={handleSelectVehicle}
                onAdd={handleAddVehicle}
                onDelete={handleDeleteVehicle}
                onClose={() => setVehiclePickerOpen(false)}
            />

            <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    errorText: { ...Typography.h3, color: Colors.error },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    backBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },
    headerSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },

    progressWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    progressStep: { alignItems: 'center', gap: 3 },
    progressDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    progressDotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
    progressDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    progressDotText: { fontSize: 9, color: Colors.textTertiary, fontWeight: '700' },
    progressLabel: { fontSize: 9, color: Colors.textTertiary },
    progressLabelActive: { color: Colors.textPrimary, fontWeight: '600' },
    progressLine: { flex: 1, height: 2, backgroundColor: Colors.borderLight, marginBottom: 12 },
    progressLineDone: { backgroundColor: Colors.success },

    content: { padding: Spacing.md, gap: Spacing.sm },
    subLabel: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.xs },

    // Selected vehicle card
    selectedVehicleCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.primaryLight, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary },
    selectedVehicleIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    iconBike: { backgroundColor: Colors.infoLight },
    iconScooty: { backgroundColor: '#F5F3FF' },
    selectedVehicleInfo: { flex: 1, gap: 2 },
    selectedVehicleName: { ...Typography.body, color: Colors.primary, fontWeight: '700' },
    selectedVehicleSub: { ...Typography.caption, color: Colors.textTertiary },
    changeBtn: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primary },
    changeBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

    // Picker trigger (empty state)
    pickerTrigger: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.primaryLight, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed' },
    pickerTriggerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary },
    pickerTriggerText: { flex: 1 },
    pickerTriggerTitle: { ...Typography.body, color: Colors.primary, fontWeight: '700' },
    pickerTriggerSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },

    // Or divider
    orRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    orLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
    orText: { ...Typography.caption, color: Colors.textTertiary },

    vehicleToggle: { flexDirection: 'row', gap: Spacing.sm },
    vehicleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
    vehicleBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    vehicleBtnText: { ...Typography.body, color: Colors.textTertiary, fontWeight: '600' },
    vehicleBtnTextActive: { color: Colors.primary },

    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bg, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 13, borderWidth: 1, borderColor: Colors.border },
    fieldInput: { ...Typography.body, flex: 1, color: Colors.textPrimary },

    emptyServices: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.xs },
    emptyServicesText: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },

    selectedSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.successLight, padding: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: '#BBF7D0' },
    selectedLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
    selectedCountText: { ...Typography.caption, color: Colors.success, fontWeight: '600' },
    selectedRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    estimatedPrice: { ...Typography.caption, color: Colors.primary, fontWeight: '800' },
    clearText: { ...Typography.caption, color: Colors.error, fontWeight: '600' },

    dateRow: { flexDirection: 'row', gap: Spacing.sm, paddingBottom: 4 },
    dateCard: { width: 64, alignItems: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, gap: 3 },
    dateCardActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    dateCardDay: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase' },
    dateCardNum: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600', textAlign: 'center' },
    dateCardTextActive: { color: Colors.primary },
    dateCardDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary },

    bookedHint: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surfaceAlt, padding: Spacing.sm, borderRadius: Radius.sm },
    bookedHintText: { ...Typography.caption, color: Colors.textTertiary },
    slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    slotChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 10, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
    slotChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    slotChipBooked: { backgroundColor: Colors.surfaceAlt, borderColor: Colors.borderLight, opacity: 0.55 },
    slotChipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
    slotChipTextActive: { color: '#fff' },
    slotChipTextBooked: { color: Colors.textTertiary },
    slotBookedLabel: { fontSize: 8, color: Colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

    summaryBox: { borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
    summaryIconBox: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    summaryTextWrap: { flex: 1 },
    summaryLabel: { ...Typography.overline, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600', marginTop: 2 },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.md },

    priceBreakdown: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
    priceBreakdownTitle: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm },
    priceBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    priceBreakdownService: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
    priceBreakdownAmount: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700' },
    priceTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, marginTop: Spacing.xs },
    priceTotalLabel: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700' },
    priceTotalValue: { ...Typography.h2, color: Colors.primary },
    priceDisclaimer: { ...Typography.caption, color: Colors.textTertiary, fontStyle: 'italic', marginTop: Spacing.xs },

    footer: { padding: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight, gap: Spacing.xs },
    footerHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm },
    footerHintText: { ...Typography.body, color: Colors.textTertiary },
    footerTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
    footerTotalLabel: { ...Typography.body, color: Colors.textTertiary, fontWeight: '600' },
    footerTotalValue: { ...Typography.h2, color: Colors.primary },
    confirmBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    confirmBtnDisabled: { opacity: 0.5 },
    confirmBtnText: { ...Typography.button, color: '#fff' },
});