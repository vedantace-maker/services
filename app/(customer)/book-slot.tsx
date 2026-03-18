import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getGarageById } from '../../utils/services/garageService';
import { createBooking } from '../../utils/services/bookingService';
import { getAvailableDates, getSlotsForDay } from '../../utils/helpers/slotGenerator';
import { Garage, DaySchedule } from '../../types';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

type VehicleType = 'bike' | 'scooty';

type AvailableDate = {
    date: string;   // "2026-03-20"
    label: string;   // "Fri, 20 Mar"
    weekday: string;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function BookSlotScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { toast, showToast, hideToast } = useToast();

    // ── Data ───────────────────────────────────────────────────────────────────
    const [garage, setGarage] = useState<Garage | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // ── Selection state ────────────────────────────────────────────────────────
    const [vehicleType, setVehicleType] = useState<VehicleType>('bike');
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

    // ── Step tracker ───────────────────────────────────────────────────────────
    // Forces user through steps in order — can't pick date before service, etc.
    const step = !selectedService ? 1
        : !selectedDate ? 2
            : !selectedSlot ? 3
                : 4;

    // ── Load garage ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getGarageById(id)
            .then((g) => {
                setGarage(g);
                const dates = getAvailableDates(g.schedule ?? [], 14);
                setAvailableDates(dates);
            })
            .catch((e: any) =>
                showToast(e?.response?.data?.detail ?? 'Failed to load garage.', 'error')
            )
            .finally(() => setLoading(false));
    }, [id]);

    // ── Reset downstream selections when vehicle type changes ─────────────────
    const handleVehicleChange = (type: VehicleType) => {
        setVehicleType(type);
        setSelectedService(null);
        setSelectedDate(null);
        setSelectedSlot(null);
        setAvailableSlots([]);
    };

    // ── When a service is selected ────────────────────────────────────────────
    const handleServiceSelect = (service: string) => {
        setSelectedService(service);
        setSelectedDate(null);
        setSelectedSlot(null);
        setAvailableSlots([]);
    };

    // ── When a date is selected — build slots from that weekday's config ───────
    const handleDateSelect = (item: AvailableDate) => {
        setSelectedDate(item.date);
        setSelectedSlot(null);

        const schedule: DaySchedule[] = garage?.schedule ?? [];
        const dayConfig = schedule.find((s) => s.day === item.weekday);
        setAvailableSlots(dayConfig ? getSlotsForDay(dayConfig) : []);
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleConfirm = async () => {
        if (!garage || !selectedService || !selectedDate || !selectedSlot) return;

        setSubmitting(true);
        try {
            await createBooking({
                garage: garage.id,
                service: selectedService,
                vehicle_type: vehicleType,
                date: selectedDate,
                time_slot: selectedSlot,
            });
            showToast('Booking confirmed!', 'success');
            setTimeout(() => router.replace('/(customer)/bookings' as any), 1200);
        } catch (e: any) {
            const msg =
                e?.response?.data?.detail ??
                e?.response?.data?.non_field_errors?.[0] ??
                'Booking failed. Please try again.';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Guards ─────────────────────────────────────────────────────────────────
    if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />;
    if (!garage) return (
        <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <Text style={styles.errorText}>Garage not found.</Text>
        </View>
    );

    const services: string[] = garage.services?.[vehicleType] ?? [];

    return (
        <View style={styles.root}>

            {/* ── Header ─────────────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Book a Slot</Text>
                    <Text style={styles.headerSub} numberOfLines={1}>{garage.name}</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            {/* ── Progress bar ────────────────────────────────────────────────────── */}
            <View style={styles.progressWrap}>
                {['Service', 'Date', 'Time', 'Confirm'].map((label, i) => {
                    const s = i + 1;
                    const done = step > s;
                    const active = step === s;
                    return (
                        <React.Fragment key={label}>
                            <View style={styles.progressStep}>
                                <View style={[
                                    styles.progressDot,
                                    done && styles.progressDotDone,
                                    active && styles.progressDotActive,
                                ]}>
                                    {done
                                        ? <Ionicons name="checkmark" size={10} color="#fff" />
                                        : <Text style={[styles.progressDotText, active && { color: '#fff' }]}>{s}</Text>
                                    }
                                </View>
                                <Text style={[styles.progressLabel, (done || active) && styles.progressLabelActive]}>
                                    {label}
                                </Text>
                            </View>
                            {i < 3 && (
                                <View style={[styles.progressLine, done && styles.progressLineDone]} />
                            )}
                        </React.Fragment>
                    );
                })}
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* ── STEP 1: Vehicle type + Service ────────────────────────────────── */}
                <SectionCard
                    step={1} title="Select Service" currentStep={step}
                    icon="construct-outline"
                >
                    {/* Vehicle type toggle */}
                    <View style={styles.vehicleToggle}>
                        {(['bike', 'scooty'] as VehicleType[]).map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.vehicleBtn, vehicleType === type && styles.vehicleBtnActive]}
                                onPress={() => handleVehicleChange(type)}
                            >
                                <Ionicons
                                    name={type === 'bike' ? 'bicycle-outline' : 'speedometer-outline'}
                                    size={18}
                                    color={vehicleType === type ? Colors.primary : Colors.textTertiary}
                                />
                                <Text style={[styles.vehicleBtnText, vehicleType === type && styles.vehicleBtnTextActive]}>
                                    {type === 'bike' ? 'Bike' : 'Scooty'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Services list */}
                    {services.length === 0 ? (
                        <View style={styles.emptyServices}>
                            <Ionicons name="alert-circle-outline" size={22} color={Colors.textTertiary} />
                            <Text style={styles.emptyServicesText}>
                                No {vehicleType} services available at this garage.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.serviceGrid}>
                            {services.map((svc) => {
                                const active = selectedService === svc;
                                return (
                                    <TouchableOpacity
                                        key={svc}
                                        style={[styles.serviceChip, active && styles.serviceChipActive]}
                                        onPress={() => handleServiceSelect(svc)}
                                        activeOpacity={0.75}
                                    >
                                        <Ionicons
                                            name={active ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={15}
                                            color={active ? Colors.primary : Colors.textTertiary}
                                        />
                                        <Text style={[styles.serviceChipText, active && styles.serviceChipTextActive]}>
                                            {svc}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </SectionCard>

                {/* ── STEP 2: Date ──────────────────────────────────────────────────── */}
                <SectionCard
                    step={2} title="Select Date" currentStep={step}
                    icon="calendar-outline"
                    locked={step < 2}
                >
                    {availableDates.length === 0 ? (
                        <View style={styles.emptyServices}>
                            <Ionicons name="calendar-outline" size={22} color={Colors.textTertiary} />
                            <Text style={styles.emptyServicesText}>
                                No available dates. The garage may not have set a schedule yet.
                            </Text>
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
                                            <Text style={[styles.dateCardDay, active && styles.dateCardTextActive]}>
                                                {weekdayShort}
                                            </Text>
                                            <Text style={[styles.dateCardNum, active && styles.dateCardTextActive]}>
                                                {dayMonth}
                                            </Text>
                                            {active && (
                                                <View style={styles.dateCardDot} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    )}
                </SectionCard>

                {/* ── STEP 3: Time slot ─────────────────────────────────────────────── */}
                <SectionCard
                    step={3} title="Select Time Slot" currentStep={step}
                    icon="time-outline"
                    locked={step < 3}
                >
                    {availableSlots.length === 0 ? (
                        <View style={styles.emptyServices}>
                            <Ionicons name="time-outline" size={22} color={Colors.textTertiary} />
                            <Text style={styles.emptyServicesText}>No slots available for this day.</Text>
                        </View>
                    ) : (
                        <View style={styles.slotGrid}>
                            {availableSlots.map((slot) => {
                                const active = selectedSlot === slot;
                                return (
                                    <TouchableOpacity
                                        key={slot}
                                        style={[styles.slotChip, active && styles.slotChipActive]}
                                        onPress={() => setSelectedSlot(slot)}
                                        activeOpacity={0.75}
                                    >
                                        <Ionicons
                                            name="time-outline"
                                            size={13}
                                            color={active ? '#fff' : Colors.textSecondary}
                                        />
                                        <Text style={[styles.slotChipText, active && styles.slotChipTextActive]}>
                                            {slot}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </SectionCard>

                {/* ── STEP 4: Confirm summary ───────────────────────────────────────── */}
                {step === 4 && selectedService && selectedDate && selectedSlot && (
                    <SectionCard step={4} title="Booking Summary" currentStep={step} icon="checkmark-circle-outline">
                        <View style={styles.summaryBox}>
                            {[
                                { icon: 'storefront-outline', label: 'Garage', value: garage.name },
                                {
                                    icon: vehicleType === 'bike' ? 'bicycle-outline' : 'speedometer-outline',
                                    label: 'Vehicle', value: vehicleType === 'bike' ? 'Bike' : 'Scooty',
                                },
                                { icon: 'construct-outline', label: 'Service', value: selectedService },
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
                    </SectionCard>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── Bottom CTA ────────────────────────────────────────────────────────── */}
            <View style={styles.footer}>
                {step < 4 ? (
                    <View style={styles.footerHint}>
                        <Ionicons name="information-circle-outline" size={15} color={Colors.textTertiary} />
                        <Text style={styles.footerHintText}>
                            {step === 1 && 'Pick a service to continue'}
                            {step === 2 && 'Pick a date to continue'}
                            {step === 3 && 'Pick a time slot to continue'}
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
                        onPress={handleConfirm}
                        disabled={submitting}
                        activeOpacity={0.88}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                                <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
        </View>
    );
}

// ── Reusable section card ──────────────────────────────────────────────────────
function SectionCard({
    step, title, currentStep, icon, locked = false, children,
}: {
    step: number; title: string; currentStep: number;
    icon: any; locked?: boolean; children: React.ReactNode;
}) {
    const done = currentStep > step;
    const active = currentStep === step;

    return (
        <View style={[sectionStyles.card, locked && sectionStyles.cardLocked]}>
            <View style={sectionStyles.titleRow}>
                <View style={[
                    sectionStyles.stepBadge,
                    done && sectionStyles.stepBadgeDone,
                    active && sectionStyles.stepBadgeActive,
                ]}>
                    {done
                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                        : <Ionicons name={icon} size={14} color={active ? '#fff' : Colors.textTertiary} />
                    }
                </View>
                <Text style={[sectionStyles.title, locked && sectionStyles.titleLocked]}>
                    {title}
                </Text>
                {locked && (
                    <Ionicons name="lock-closed-outline" size={14} color={Colors.textTertiary} />
                )}
            </View>
            {!locked && <View style={sectionStyles.body}>{children}</View>}
        </View>
    );
}

const sectionStyles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm,
    },
    cardLocked: { opacity: 0.5 },
    titleRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        padding: Spacing.md,
    },
    stepBadge: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },
    stepBadgeDone: { backgroundColor: Colors.success, borderColor: Colors.success },
    stepBadgeActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    title: { ...Typography.h3, color: Colors.textPrimary, flex: 1 },
    titleLocked: { color: Colors.textTertiary },
    body: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm },
});

// ── Main styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    errorText: { ...Typography.h3, color: Colors.error },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 56, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: Radius.sm,
        backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },
    headerSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },

    // Progress
    progressWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    progressStep: { alignItems: 'center', gap: 3 },
    progressDot: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
        alignItems: 'center', justifyContent: 'center',
    },
    progressDotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
    progressDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    progressDotText: { fontSize: 9, color: Colors.textTertiary, fontWeight: '700' },
    progressLabel: { fontSize: 9, color: Colors.textTertiary },
    progressLabelActive: { color: Colors.textPrimary, fontWeight: '600' },
    progressLine: { flex: 1, height: 2, backgroundColor: Colors.borderLight, marginBottom: 12 },
    progressLineDone: { backgroundColor: Colors.success },

    // Content
    content: { padding: Spacing.md, gap: Spacing.sm },

    // Vehicle toggle
    vehicleToggle: { flexDirection: 'row', gap: Spacing.sm },
    vehicleBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.xs, paddingVertical: Spacing.sm,
        backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
        borderWidth: 1.5, borderColor: Colors.border,
    },
    vehicleBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    vehicleBtnText: { ...Typography.body, color: Colors.textTertiary, fontWeight: '600' },
    vehicleBtnTextActive: { color: Colors.primary },

    // Services
    emptyServices: {
        alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.xs,
    },
    emptyServicesText: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },
    serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    serviceChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: Spacing.md, paddingVertical: 10,
        backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full,
        borderWidth: 1.5, borderColor: Colors.border,
    },
    serviceChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    serviceChipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
    serviceChipTextActive: { color: Colors.primary },

    // Dates
    dateRow: { flexDirection: 'row', gap: Spacing.sm, paddingBottom: 4 },
    dateCard: {
        width: 64, alignItems: 'center', paddingVertical: Spacing.sm,
        backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
        borderWidth: 1.5, borderColor: Colors.border, gap: 3,
    },
    dateCardActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    dateCardDay: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase' },
    dateCardNum: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600', textAlign: 'center' },
    dateCardTextActive: { color: Colors.primary },
    dateCardDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary },

    // Slots
    slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    slotChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: Spacing.md, paddingVertical: 10,
        backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
        borderWidth: 1.5, borderColor: Colors.border,
    },
    slotChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    slotChipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
    slotChipTextActive: { color: '#fff' },

    // Summary
    summaryBox: {
        borderRadius: Radius.md, borderWidth: 1,
        borderColor: Colors.border, overflow: 'hidden',
    },
    summaryRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: Spacing.md, padding: Spacing.md,
    },
    summaryIconBox: {
        width: 32, height: 32, borderRadius: Radius.sm,
        backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
    },
    summaryTextWrap: { flex: 1 },
    summaryLabel: { ...Typography.overline, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600', marginTop: 2 },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.md },

    // Footer
    footer: {
        padding: Spacing.md, backgroundColor: Colors.surface,
        borderTopWidth: 1, borderTopColor: Colors.borderLight,
    },
    footerHint: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.xs, paddingVertical: Spacing.sm,
    },
    footerHintText: { ...Typography.body, color: Colors.textTertiary },
    confirmBtn: {
        backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    },
    confirmBtnDisabled: { backgroundColor: Colors.primary + '80' },
    confirmBtnText: { ...Typography.button, color: '#fff' },
});
