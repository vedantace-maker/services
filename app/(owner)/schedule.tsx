import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getGarageSchedule, getMyGarage, updateGarageSchedule } from '../../utils/services/garageService';
import { Weekday, DaySchedule } from '../../types';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

// ── Constants ─────────────────────────────────────────────────────────────────
const WEEKDAYS: Weekday[] = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

const DAY_SHORT: Record<Weekday, string> = {
    Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
    Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);   // 0..23
const INTERVALS = [30, 60, 90, 120];

const DEFAULT_DAY = (day: Weekday): DaySchedule => ({
    day, isOpen: false, startHour: 9, endHour: 18, intervalMinutes: 60,
});

function formatHour(h: number) {
    if (h === 0) return '12:00 AM';
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return '12:00 PM';
    return `${h - 12}:00 PM`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
    const { toast, showToast, hideToast } = useToast();

    const [schedule, setSchedule] = useState<Record<Weekday, DaySchedule>>(
        () => Object.fromEntries(WEEKDAYS.map((d) => [d, DEFAULT_DAY(d)])) as Record<Weekday, DaySchedule>
    );
    const [expanded, setExpanded] = useState<Weekday | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // ── Add garageId to state ─────────────────────────────────────────
    const [garageId, setGarageId] = useState<string | null>(null);


    // ── Load existing schedule ─────────────────────────────────────────────────
    useFocusEffect(useCallback(() => { load(); }, []));

    const load = async () => {
        setLoading(true);
        try {
            // Step 1 — get garage to extract its id
            const garage = await getMyGarage();
            setGarageId(String(garage.id));

            // Step 2 — fetch schedule using that id
            const scheduleData = await getGarageSchedule(garage.id);

            if (scheduleData?.length) {
                const map = {
                    ...Object.fromEntries(WEEKDAYS.map((d) => [d, DEFAULT_DAY(d)])),
                };
                scheduleData.forEach((s) => {
                    if (s.day) map[s.day as Weekday] = s;
                });
                setSchedule(map as Record<Weekday, DaySchedule>);
            }
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Failed to load schedule.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
    const update = (day: Weekday, patch: Partial<DaySchedule>) =>
        setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));

    const toggleDay = (day: Weekday, value: boolean) => {
        update(day, { isOpen: value });
        // Auto-expand when turned on
        if (value) setExpanded(day);
    };

    const countSlots = (s: DaySchedule): number => {
        if (!s.isOpen) return 0;
        const totalMins = (s.endHour - s.startHour) * 60;
        return Math.max(0, Math.floor(totalMins / s.intervalMinutes));
    };

    // ── Quick presets ──────────────────────────────────────────────────────────
    const applyPreset = (preset: 'weekdays' | 'everyday' | 'clear') => {
        setSchedule((prev) => {
            const next = { ...prev };
            WEEKDAYS.forEach((d) => {
                if (preset === 'clear') {
                    next[d] = { ...next[d], isOpen: false };
                } else if (preset === 'weekdays') {
                    next[d] = { ...next[d], isOpen: d !== 'Saturday' && d !== 'Sunday' };
                } else {
                    next[d] = { ...next[d], isOpen: true };
                }
            });
            return next;
        });
    };

    // ── Save ───────────────────────────────────────────────────────────────────
    // ── Replace handleSave() ──────────────────────────────────────────
    const handleSave = async () => {
        if (!garageId) {
            showToast('Garage not found. Please try again.', 'error');
            return;
        }

        // Validate open days
        for (const day of WEEKDAYS) {
            const s = schedule[day];
            if (s.isOpen && s.endHour <= s.startHour) {
                showToast(`${day}: closing time must be after opening time.`, 'warning');
                return;
            }
        }

        setSaving(true);
        try {
            await updateGarageSchedule(garageId, Object.values(schedule));
            showToast('Schedule saved successfully.', 'success');
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Failed to save schedule.', 'error');
        } finally {
            setSaving(false);
        }
    };


    // ── Open days summary ──────────────────────────────────────────────────────
    const openDays = WEEKDAYS.filter((d) => schedule[d].isOpen);
    const closedDays = WEEKDAYS.filter((d) => !schedule[d].isOpen);

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />;

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>

                {/* ── Header ──────────────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Weekly Schedule</Text>
                        <Text style={styles.headerSub}>
                            {openDays.length} day{openDays.length !== 1 ? 's' : ''} open each week
                        </Text>
                    </View>
                    <View style={styles.summaryPill}>
                        <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                        <Text style={styles.summaryPillText}>{openDays.length}/7</Text>
                    </View>
                </View>

                {/* ── Quick presets ────────────────────────────────────────────────── */}
                <View style={styles.presetsRow}>
                    <Text style={styles.presetsLabel}>Quick Set:</Text>
                    {[
                        { key: 'weekdays', label: 'Mon–Fri' },
                        { key: 'everyday', label: 'Every Day' },
                        { key: 'clear', label: 'All Closed' },
                    ].map((p) => (
                        <TouchableOpacity
                            key={p.key}
                            style={styles.presetBtn}
                            onPress={() => applyPreset(p.key as any)}
                        >
                            <Text style={styles.presetBtnText}>{p.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Week overview strip ──────────────────────────────────────────── */}
                <View style={styles.weekStrip}>
                    {WEEKDAYS.map((day) => {
                        const isOpen = schedule[day].isOpen;
                        return (
                            <TouchableOpacity
                                key={day}
                                style={[styles.dayChip, isOpen ? styles.dayChipOpen : styles.dayChipClosed]}
                                onPress={() => toggleDay(day, !isOpen)}
                            >
                                <Text style={[styles.dayChipText, isOpen ? styles.dayChipTextOpen : styles.dayChipTextClosed]}>
                                    {DAY_SHORT[day]}
                                </Text>
                                <View style={[styles.dayChipDot, { backgroundColor: isOpen ? Colors.success : Colors.borderLight }]} />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Day cards ────────────────────────────────────────────────────── */}
                {WEEKDAYS.map((day) => {
                    const s = schedule[day];
                    const isExpanded = expanded === day;
                    const slots = countSlots(s);
                    const isWeekend = day === 'Saturday' || day === 'Sunday';

                    return (
                        <View
                            key={day}
                            style={[styles.dayCard, !s.isOpen && styles.dayCardClosed]}
                        >
                            {/* ── Row 1: toggle + name + expand ─────────────────────────── */}
                            <TouchableOpacity
                                style={styles.dayCardHeader}
                                onPress={() => s.isOpen && setExpanded(isExpanded ? null : day)}
                                activeOpacity={s.isOpen ? 0.7 : 1}
                            >
                                <Switch
                                    value={s.isOpen}
                                    onValueChange={(v) => toggleDay(day, v)}
                                    trackColor={{ false: Colors.borderLight, true: Colors.primary + '60' }}
                                    thumbColor={s.isOpen ? Colors.primary : Colors.textTertiary}
                                />

                                <View style={styles.dayCardNameWrap}>
                                    <Text style={[styles.dayCardName, !s.isOpen && styles.dayCardNameClosed]}>
                                        {day}
                                    </Text>
                                    {isWeekend && (
                                        <View style={styles.weekendBadge}>
                                            <Text style={styles.weekendBadgeText}>Weekend</Text>
                                        </View>
                                    )}
                                </View>

                                {s.isOpen ? (
                                    <View style={styles.dayCardMeta}>
                                        <Text style={styles.dayCardMetaText}>
                                            {formatHour(s.startHour)} – {formatHour(s.endHour)}
                                        </Text>
                                        <Text style={styles.dayCardSlotCount}>{slots} slots</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.dayCardClosed_label}>Closed</Text>
                                )}

                                {s.isOpen && (
                                    <Ionicons
                                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={16}
                                        color={Colors.textTertiary}
                                    />
                                )}
                            </TouchableOpacity>

                            {/* ── Row 2: time + interval pickers (expanded) ─────────────── */}
                            {s.isOpen && isExpanded && (
                                <View style={styles.dayCardBody}>
                                    <View style={styles.divider} />

                                    {/* Opening time */}
                                    <View style={styles.pickerSection}>
                                        <Text style={styles.pickerLabel}>
                                            <Ionicons name="sunny-outline" size={13} color={Colors.warning} /> Opening Time
                                        </Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                                            {HOURS.slice(4, 14).map((h) => (
                                                <TouchableOpacity
                                                    key={h}
                                                    style={[styles.timeChip, s.startHour === h && styles.timeChipActive]}
                                                    onPress={() => update(day, { startHour: h })}
                                                >
                                                    <Text style={[styles.timeChipText, s.startHour === h && styles.timeChipTextActive]}>
                                                        {formatHour(h)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    {/* Closing time */}
                                    <View style={styles.pickerSection}>
                                        <Text style={styles.pickerLabel}>
                                            <Ionicons name="moon-outline" size={13} color={Colors.info} /> Closing Time
                                        </Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                                            {HOURS.slice(10, 24).map((h) => (
                                                <TouchableOpacity
                                                    key={h}
                                                    style={[
                                                        styles.timeChip,
                                                        s.endHour === h && styles.timeChipActive,
                                                        h <= s.startHour && styles.timeChipDisabled,
                                                    ]}
                                                    onPress={() => h > s.startHour && update(day, { endHour: h })}
                                                >
                                                    <Text style={[
                                                        styles.timeChipText,
                                                        s.endHour === h && styles.timeChipTextActive,
                                                        h <= s.startHour && styles.timeChipTextDisabled,
                                                    ]}>
                                                        {formatHour(h)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    {/* Slot interval */}
                                    <View style={styles.pickerSection}>
                                        <Text style={styles.pickerLabel}>
                                            <Ionicons name="time-outline" size={13} color={Colors.success} /> Slot Interval
                                        </Text>
                                        <View style={styles.intervalRow}>
                                            {INTERVALS.map((mins) => (
                                                <TouchableOpacity
                                                    key={mins}
                                                    style={[styles.intervalChip, s.intervalMinutes === mins && styles.intervalChipActive]}
                                                    onPress={() => update(day, { intervalMinutes: mins })}
                                                >
                                                    <Text style={[styles.intervalChipText, s.intervalMinutes === mins && styles.intervalChipTextActive]}>
                                                        {mins} min
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    {/* Slots preview */}
                                    <View style={styles.slotsPreview}>
                                        <Ionicons name="grid-outline" size={14} color={Colors.primary} />
                                        <Text style={styles.slotsPreviewText}>
                                            {slots} slots · {formatHour(s.startHour)} to {formatHour(s.endHour)} every {s.intervalMinutes} min
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* ── Closed days note ─────────────────────────────────────────────── */}
                {closedDays.length > 0 && (
                    <View style={styles.closedNote}>
                        <Ionicons name="information-circle-outline" size={15} color={Colors.textTertiary} />
                        <Text style={styles.closedNoteText}>
                            Customers cannot book on:{' '}
                            <Text style={{ fontWeight: '700' }}>
                                {closedDays.map((d) => DAY_SHORT[d]).join(', ')}
                            </Text>
                        </Text>
                    </View>
                )}

            </ScrollView>

            {/* ── Save button ────────────────────────────────────────────────────── */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.88}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                            <Text style={styles.saveBtnText}>Save Weekly Schedule</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, padding: Spacing.md,
        borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
    },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },
    headerSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 4 },
    summaryPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm,
        paddingVertical: 6, borderRadius: Radius.full,
    },
    summaryPillText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

    presetsRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap',
    },
    presetsLabel: { ...Typography.caption, color: Colors.textTertiary },
    presetBtn: {
        paddingHorizontal: Spacing.md, paddingVertical: 7,
        backgroundColor: Colors.surface, borderRadius: Radius.full,
        borderWidth: 1, borderColor: Colors.border,
    },
    presetBtnText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },

    weekStrip: {
        flexDirection: 'row', gap: Spacing.xs,
        backgroundColor: Colors.surface, padding: Spacing.sm,
        borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
        justifyContent: 'space-between',
    },
    dayChip: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.md, gap: 4 },
    dayChipOpen: { backgroundColor: Colors.primaryLight },
    dayChipClosed: { backgroundColor: Colors.surfaceAlt },
    dayChipText: { fontSize: 10, fontWeight: '700' },
    dayChipTextOpen: { color: Colors.primary },
    dayChipTextClosed: { color: Colors.textTertiary },
    dayChipDot: { width: 5, height: 5, borderRadius: 3 },

    dayCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm,
    },
    dayCardClosed: { opacity: 0.65 },
    dayCardHeader: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        padding: Spacing.md,
    },
    dayCardNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    dayCardName: { ...Typography.h3, color: Colors.textPrimary },
    dayCardNameClosed: { color: Colors.textTertiary },
    weekendBadge: {
        backgroundColor: Colors.warningLight, paddingHorizontal: 7, paddingVertical: 2,
        borderRadius: Radius.full,
    },
    weekendBadgeText: { fontSize: 9, fontWeight: '700', color: '#92400E' },
    dayCardMeta: { alignItems: 'flex-end', gap: 2 },
    dayCardMetaText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
    dayCardSlotCount: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
    dayCardClosed_label: { ...Typography.caption, color: Colors.textTertiary, fontStyle: 'italic' },

    dayCardBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.md },
    divider: { height: 1, backgroundColor: Colors.borderLight },

    pickerSection: { gap: Spacing.xs },
    pickerLabel: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
    pickerScroll: { flexGrow: 0 },

    timeChip: {
        paddingHorizontal: Spacing.md, paddingVertical: 8,
        backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
        marginRight: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
    },
    timeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    timeChipDisabled: { opacity: 0.35 },
    timeChipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
    timeChipTextActive: { color: '#fff' },
    timeChipTextDisabled: { color: Colors.textTertiary },

    intervalRow: { flexDirection: 'row', gap: Spacing.sm },
    intervalChip: {
        flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
        backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
        borderWidth: 1, borderColor: Colors.border,
    },
    intervalChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    intervalChipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
    intervalChipTextActive: { color: '#fff' },

    slotsPreview: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
        backgroundColor: Colors.primaryLight, padding: Spacing.sm, borderRadius: Radius.sm,
    },
    slotsPreviewText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

    closedNote: {
        flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs,
        backgroundColor: Colors.surfaceAlt, padding: Spacing.md,
        borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    },
    closedNoteText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 18 },

    footer: {
        padding: Spacing.md, backgroundColor: Colors.surface,
        borderTopWidth: 1, borderTopColor: Colors.borderLight,
    },
    saveBtn: {
        backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    },
    saveBtnDisabled: { backgroundColor: Colors.primary + '80' },
    saveBtnText: { ...Typography.button, color: '#fff' },
});
