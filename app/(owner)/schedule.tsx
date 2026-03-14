import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Alert, ScrollView, Switch, ActivityIndicator,
    Modal, FlatList
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { getGarageById, updateGarageSchedule } from '../../utils/storage';
import { generateTimeSlots } from '../../utils/distance';
import { useAuthStore } from '../../store/authStore';
import { DaySchedule } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const to12h = (hour: number): string => {
    if (hour === 0) return '12:00 AM';
    if (hour === 12) return '12:00 PM';
    return hour < 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
    label: to12h(i),
    value: i,
}));

const INTERVAL_OPTIONS = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '45 minutes', value: 45 },
    { label: '60 minutes (1 hr)', value: 60 },
    { label: '90 minutes (1.5 hr)', value: 90 },
    { label: '120 minutes (2 hr)', value: 120 },
];

// ─── Reusable Dropdown Component ─────────────────────────────────────────────
interface DropdownOption { label: string; value: number; }

interface DropdownProps {
    label: string;
    options: DropdownOption[];
    value: number;
    onChange: (val: number) => void;
    accentColor?: string;
}

function Dropdown({ label, options, value, onChange, accentColor = '#FF6B35' }: DropdownProps) {
    const [open, setOpen] = useState(false);
    const selected = options.find((o) => o.value === value);

    return (
        <View style={dropStyles.container}>
            <Text style={dropStyles.label}>{label}</Text>
            <TouchableOpacity
                style={[dropStyles.selector, { borderColor: open ? accentColor : '#ddd' }]}
                onPress={() => setOpen(true)}
                activeOpacity={0.8}
            >
                <Text style={dropStyles.selectorText}>{selected?.label ?? '—'}</Text>
                <Text style={[dropStyles.arrow, { color: accentColor }]}>▾</Text>
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <TouchableOpacity
                    style={dropStyles.backdrop}
                    activeOpacity={1}
                    onPress={() => setOpen(false)}
                >
                    <View style={dropStyles.sheet}>
                        <View style={dropStyles.sheetHeader}>
                            <Text style={dropStyles.sheetTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setOpen(false)}>
                                <Text style={dropStyles.sheetClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.value.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        dropStyles.option,
                                        item.value === value && { backgroundColor: accentColor + '15' }
                                    ]}
                                    onPress={() => {
                                        onChange(item.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            dropStyles.optionText,
                                            item.value === value && { color: accentColor, fontWeight: '700' }
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {item.value === value ? (
                                        <Text style={[dropStyles.optionCheck, { color: accentColor }]}>✓</Text>
                                    ) : null}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const dropStyles = StyleSheet.create({
    container: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
    selector: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14,
        paddingVertical: 12, backgroundColor: '#fff'
    },
    selectorText: { fontSize: 15, color: '#222', fontWeight: '500' },
    arrow: { fontSize: 18, fontWeight: 'bold' },
    backdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end'
    },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 20,
        borderTopRightRadius: 20, maxHeight: '55%', paddingBottom: 30
    },
    sheetHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', padding: 16,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
    },
    sheetTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    sheetClose: { fontSize: 18, color: '#aaa', padding: 4 },
    option: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: '#f8f8f8'
    },
    optionText: { fontSize: 15, color: '#333' },
    optionCheck: { fontSize: 16, fontWeight: 'bold' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ManageScheduleScreen() {
    const user = useAuthStore((s) => s.user);

    const [selectedDate, setSelectedDate] = useState('');
    const [isOpen, setIsOpen] = useState(true);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [existingDay, setExistingDay] = useState<DaySchedule | null>(null);

    const [startHour, setStartHour] = useState(9);
    const [endHour, setEndHour] = useState(18);
    const [intervalMin, setIntervalMin] = useState(60);

    const [editingConfig, setEditingConfig] = useState(false);
    const [tempStart, setTempStart] = useState(9);
    const [tempEnd, setTempEnd] = useState(18);
    const [tempInterval, setTempInterval] = useState(60);

    // ─── Load day ───────────────────────────────────────────────────────────────
    const loadDay = async (date: string) => {
        setLoading(true);
        const garage = await getGarageById(user!.uid);
        if (garage) {
            const day = garage.schedule.find((d) => d.date === date) ?? null;
            setExistingDay(day);
            setIsOpen(day ? day.isOpen : true);
            if (day && day.slots.length > 0) {
                const times = day.slots.map((s) => {
                    const [h, m] = s.time.split(':').map(Number);
                    return h * 60 + m;
                });
                const savedStart = Math.floor(Math.min(...times) / 60);
                const savedEnd = Math.floor(Math.max(...times) / 60) + 1;
                const savedInterval = times.length > 1 ? times[1] - times[0] : 60;
                setStartHour(savedStart); setEndHour(savedEnd); setIntervalMin(savedInterval);
                setTempStart(savedStart); setTempEnd(savedEnd); setTempInterval(savedInterval);
            } else {
                setStartHour(9); setEndHour(18); setIntervalMin(60);
                setTempStart(9); setTempEnd(18); setTempInterval(60);
            }
        }
        setEditingConfig(false);
        setLoading(false);
    };

    // ─── Apply config ───────────────────────────────────────────────────────────
    const applyConfig = () => {
        if (tempStart >= tempEnd) {
            Alert.alert('Invalid Hours', 'Opening time must be before closing time.');
            return;
        }
        if ((tempEnd - tempStart) * 60 < tempInterval) {
            Alert.alert('Invalid Slots', 'Slot duration is longer than total working hours.');
            return;
        }
        setStartHour(tempStart);
        setEndHour(tempEnd);
        setIntervalMin(tempInterval);
        setEditingConfig(false);
    };

    // ─── Save schedule ──────────────────────────────────────────────────────────
    const saveSchedule = async () => {
        if (!selectedDate) { Alert.alert('Select a date first'); return; }
        if (startHour >= endHour) {
            Alert.alert('Invalid Hours', 'Opening time must be before closing time.');
            return;
        }
        setSaving(true);
        try {
            const garage = await getGarageById(user!.uid);
            if (!garage) { Alert.alert('Error', 'Garage not found.'); return; }

            const current = [...garage.schedule];
            const idx = current.findIndex((d) => d.date === selectedDate);
            const newDay: DaySchedule = {
                date: selectedDate,
                isOpen,
                slots: isOpen ? generateTimeSlots(startHour, endHour, intervalMin) : [],
            };
            if (idx >= 0) current[idx] = newDay;
            else current.push(newDay);

            await updateGarageSchedule(user!.uid, current);
            setExistingDay(newDay);
            Alert.alert('✅ Saved', `Schedule for ${selectedDate} updated.`);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const slotCount = isOpen
        ? generateTimeSlots(startHour, endHour, intervalMin).length
        : 0;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.title}>Manage Your Schedule</Text>

            {/* Calendar */}
            <Calendar
                minDate={new Date().toISOString().split('T')[0]}
                onDayPress={(day: any) => {
                    setSelectedDate(day.dateString);
                    loadDay(day.dateString);
                }}
                markedDates={{ [selectedDate]: { selected: true, selectedColor: '#FF6B35' } }}
            />

            {selectedDate ? (
                loading ? (
                    <ActivityIndicator color="#FF6B35" style={{ marginTop: 24 }} />
                ) : (
                    <>
                        {/* Open / Closed toggle */}
                        <View style={styles.card}>
                            <Text style={styles.dateLabel}>📅 {selectedDate}</Text>
                            <View style={styles.switchRow}>
                                <View>
                                    <Text style={styles.switchTitle}>Open for Bookings</Text>
                                    <Text style={styles.switchSub}>
                                        {isOpen ? 'Customers can book slots' : 'Garage closed this day'}
                                    </Text>
                                </View>
                                <Switch
                                    value={isOpen}
                                    onValueChange={setIsOpen}
                                    thumbColor={isOpen ? '#FF6B35' : '#ccc'}
                                    trackColor={{ true: '#FFCBB4', false: '#eee' }}
                                />
                            </View>
                        </View>

                        {/* Working Hours & Slots Card */}
                        {isOpen ? (
                            <View style={styles.card}>
                                <View style={styles.configHeader}>
                                    <Text style={styles.cardTitle}>⚙️ Working Hours & Slots</Text>
                                    {!editingConfig ? (
                                        <TouchableOpacity
                                            style={styles.editConfigBtn}
                                            onPress={() => {
                                                setTempStart(startHour);
                                                setTempEnd(endHour);
                                                setTempInterval(intervalMin);
                                                setEditingConfig(true);
                                            }}
                                        >
                                            <Text style={styles.editConfigBtnText}>✏️ Edit</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>

                                {/* ── VIEW MODE ─────────────────────────────────────────── */}
                                {!editingConfig ? (
                                    <>
                                        <View style={styles.configRow}>
                                            <View style={styles.configBox}>
                                                <Text style={styles.configBoxLabel}>Opens At</Text>
                                                <Text style={styles.configBoxValue}>{to12h(startHour)}</Text>
                                            </View>
                                            <Text style={styles.configArrow}>→</Text>
                                            <View style={styles.configBox}>
                                                <Text style={styles.configBoxLabel}>Closes At</Text>
                                                <Text style={styles.configBoxValue}>{to12h(endHour)}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.divider} />

                                        <View style={styles.configRow}>
                                            <View style={styles.configBox}>
                                                <Text style={styles.configBoxLabel}>Per Slot</Text>
                                                <Text style={styles.configBoxValue}>{intervalMin} min</Text>
                                            </View>
                                            <Text style={styles.configArrow}>=</Text>
                                            <View style={styles.configBox}>
                                                <Text style={styles.configBoxLabel}>Total Slots</Text>
                                                <Text style={[styles.configBoxValue, { color: '#FF6B35' }]}>
                                                    {slotCount} slots
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Slot preview */}
                                        <View style={styles.slotPreviewBox}>
                                            <Text style={styles.slotPreviewLabel}>Slot Preview</Text>
                                            <View style={styles.slotPreviewChips}>
                                                {generateTimeSlots(startHour, endHour, intervalMin)
                                                    .slice(0, 6)
                                                    .map((s) => (
                                                        <View key={s.id} style={styles.previewChip}>
                                                            <Text style={styles.previewChipText}>{s.time}</Text>
                                                        </View>
                                                    ))}
                                                {slotCount > 6 ? (
                                                    <View style={styles.previewChipMore}>
                                                        <Text style={styles.previewChipMoreText}>+{slotCount - 6} more</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    /* ── EDIT MODE ──────────────────────────────────────── */
                                    <>
                                        <Dropdown
                                            label="🕐 Opening Time"
                                            options={HOUR_OPTIONS.slice(0, 23)}
                                            value={tempStart}
                                            onChange={setTempStart}
                                        />

                                        <Dropdown
                                            label="🕐 Closing Time"
                                            options={HOUR_OPTIONS.slice(1)}
                                            value={tempEnd}
                                            onChange={setTempEnd}
                                        />

                                        <Dropdown
                                            label="⏱️ Time Per Slot"
                                            options={INTERVAL_OPTIONS}
                                            value={tempInterval}
                                            onChange={setTempInterval}
                                        />

                                        {/* Live preview */}
                                        {tempStart < tempEnd ? (
                                            <View style={styles.livePreview}>
                                                <Text style={styles.livePreviewText}>
                                                    {to12h(tempStart)} → {to12h(tempEnd)}  •  {tempInterval} min/slot  •  {' '}
                                                    <Text style={{ color: '#FF6B35', fontWeight: 'bold' }}>
                                                        {generateTimeSlots(tempStart, tempEnd, tempInterval).length} total slots
                                                    </Text>
                                                </Text>
                                            </View>
                                        ) : null}

                                        <View style={styles.configBtnRow}>
                                            <TouchableOpacity
                                                style={styles.configCancelBtn}
                                                onPress={() => setEditingConfig(false)}
                                            >
                                                <Text style={styles.configCancelText}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.configApplyBtn}
                                                onPress={applyConfig}
                                            >
                                                <Text style={styles.configApplyText}>Apply Changes</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>
                        ) : null}

                        {/* Save Button */}
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={saveSchedule}
                            disabled={saving}
                        >
                            {saving
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.saveBtnText}>Save Schedule for {selectedDate}</Text>
                            }
                        </TouchableOpacity>
                    </>
                )
            ) : (
                <Text style={styles.hint}>Select a date above to configure your availability.</Text>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 16 },

    card: {
        backgroundColor: '#fff', borderRadius: 16,
        padding: 16, marginTop: 16, elevation: 2
    },
    dateLabel: { fontSize: 15, fontWeight: '600', color: '#FF6B35', marginBottom: 14 },

    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switchTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
    switchSub: { fontSize: 12, color: '#aaa', marginTop: 2 },

    configHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16
    },
    cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#222' },
    editConfigBtn: {
        backgroundColor: '#FFF3EF', paddingHorizontal: 12,
        paddingVertical: 6, borderRadius: 20,
        borderWidth: 1, borderColor: '#FF6B35'
    },
    editConfigBtnText: { color: '#FF6B35', fontWeight: '600', fontSize: 13 },

    configRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    configBox: { alignItems: 'center', flex: 1 },
    configBoxLabel: { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 },
    configBoxValue: { fontSize: 18, fontWeight: 'bold', color: '#222', marginTop: 4 },
    configArrow: { fontSize: 20, color: '#ccc' },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 14 },

    slotPreviewBox: { marginTop: 14, backgroundColor: '#f9f9f9', borderRadius: 10, padding: 12 },
    slotPreviewLabel: {
        fontSize: 12, color: '#aaa', marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: 0.5
    },
    slotPreviewChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    previewChip: {
        backgroundColor: '#FFF3EF', borderWidth: 1,
        borderColor: '#FFCBB4', paddingHorizontal: 10,
        paddingVertical: 4, borderRadius: 20
    },
    previewChipText: { color: '#FF6B35', fontSize: 12, fontWeight: '600' },
    previewChipMore: {
        backgroundColor: '#f0f0f0', paddingHorizontal: 10,
        paddingVertical: 4, borderRadius: 20
    },
    previewChipMoreText: { color: '#888', fontSize: 12 },

    livePreview: {
        backgroundColor: '#FFF3EF', borderRadius: 10,
        padding: 12, marginTop: 4, marginBottom: 12
    },
    livePreviewText: { color: '#555', fontSize: 13, textAlign: 'center' },

    configBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    configCancelBtn: {
        flex: 1, borderWidth: 1, borderColor: '#ddd',
        padding: 12, borderRadius: 10, alignItems: 'center'
    },
    configCancelText: { color: '#888', fontWeight: '600' },
    configApplyBtn: {
        flex: 1, backgroundColor: '#FF6B35',
        padding: 12, borderRadius: 10, alignItems: 'center'
    },
    configApplyText: { color: '#fff', fontWeight: 'bold' },

    saveBtn: {
        backgroundColor: '#FF6B35', padding: 16,
        borderRadius: 14, alignItems: 'center', marginTop: 20
    },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    hint: { textAlign: 'center', color: '#aaa', marginTop: 32, fontSize: 14 },
});
