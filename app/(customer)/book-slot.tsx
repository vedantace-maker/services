import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { getGarageById, updateGarageSchedule, addBooking } from '../../utils/storage';
import { generateId } from '../../utils/helpers';
import { useAuthStore } from '../../store/authStore';
import { Garage, DaySchedule, TimeSlot } from '../../types';

export default function BookSlotScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const user = useAuthStore((s) => s.user);

    const [garage, setGarage] = useState<Garage | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [daySchedule, setDaySchedule] = useState<DaySchedule | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [bikeDetails, setBikeDetails] = useState('');
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [booking, setBooking] = useState(false);

    useEffect(() => {
        if (id) getGarageById(id).then(setGarage);
    }, [id]);

    const fetchDaySchedule = async (date: string) => {
        if (!id) return;
        setLoadingSlots(true);
        setSelectedSlot(null);
        setDaySchedule(null);
        const latest = await getGarageById(id);
        if (latest) {
            setDaySchedule(latest.schedule.find((d) => d.date === date) ?? null);
        }
        setLoadingSlots(false);
    };

    const submitBooking = async () => {
        if (!selectedSlot) {
            Alert.alert('No Slot Selected', 'Please select a time slot first.');
            return;
        }
        if (!bikeDetails.trim()) {
            Alert.alert('Missing Info', 'Please enter your bike details before booking.');
            return;
        }
        if (!garage) return;

        setBooking(true);
        try {
            await addBooking({
                id: generateId(),
                customerUid: user!.uid,
                customerName: user!.name,
                garageId: garage.id,
                garageName: garage.name,
                date: selectedDate,
                time: selectedSlot.time,
                status: 'pending',
                createdAt: Date.now(),
                bikeDetails: bikeDetails.trim(),
            });

            // Mark slot as booked in garage schedule
            const latest = await getGarageById(garage.id);
            if (latest) {
                const updatedSchedule = latest.schedule.map((d) => {
                    if (d.date !== selectedDate) return d;
                    return {
                        ...d,
                        slots: d.slots.map((s) =>
                            s.id === selectedSlot.id
                                ? { ...s, isBooked: true, bookedBy: user!.uid, bookedByName: user!.name }
                                : s
                        ),
                    };
                });
                await updateGarageSchedule(garage.id, updatedSchedule);
            }

            setSelectedSlot(null);
            Alert.alert(
                '📩 Request Sent!',
                'Your booking request has been sent to the garage owner. You will be notified once it is accepted.'
            );
            fetchDaySchedule(selectedDate);
        } catch (e: any) {
            Alert.alert('Booking Failed', e.message);
        } finally {
            setBooking(false);
        }
    };

    const availableSlots = daySchedule?.slots?.filter((s) => !s.isBooked) ?? [];

    if (!garage) return <ActivityIndicator style={{ flex: 1 }} color="#FF6B35" />;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={styles.garageName}>{garage.name}</Text>

            {/* Calendar */}
            <Text style={styles.label}>Select a Date</Text>
            <Calendar
                minDate={new Date().toISOString().split('T')[0]}
                onDayPress={(day: any) => {
                    setSelectedDate(day.dateString);
                    fetchDaySchedule(day.dateString);
                }}
                markedDates={{ [selectedDate]: { selected: true, selectedColor: '#FF6B35' } }}
            />

            {/* Bike details input */}
            <Text style={styles.label}>Vehicle Details</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Honda Activa, MH31 AB1234"
                value={bikeDetails}
                onChangeText={setBikeDetails}
                placeholderTextColor="#aaa"
            />

            {/* Slots */}
            {selectedDate ? (
                <>
                    <Text style={styles.label}>Available Slots — {selectedDate}</Text>

                    {loadingSlots ? (
                        <ActivityIndicator color="#FF6B35" style={{ marginTop: 16 }} />
                    ) : !daySchedule || !daySchedule.isOpen ? (
                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>🚫 Garage is closed on this day.</Text>
                        </View>
                    ) : availableSlots.length === 0 ? (
                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>😔 All slots are booked. Try another date.</Text>
                        </View>
                    ) : (
                        <>
                            {/* Info note */}
                            <View style={styles.noteBox}>
                                <Text style={styles.noteText}>
                                    💡 Select a slot below then tap the button to send your booking request.
                                </Text>
                            </View>

                            {/* Slot grid */}
                            <View style={styles.slotsGrid}>
                                {availableSlots.map((slot) => {
                                    const isSelected = selectedSlot?.id === slot.id;
                                    return (
                                        <TouchableOpacity
                                            key={slot.id}
                                            style={[
                                                styles.slotBtn,
                                                isSelected && styles.slotBtnSelected,
                                            ]}
                                            onPress={() =>
                                                setSelectedSlot(isSelected ? null : slot)
                                            }
                                            disabled={booking}
                                        >
                                            {isSelected ? (
                                                <Text style={styles.slotCheckmark}>✓</Text>
                                            ) : null}
                                            <Text style={[
                                                styles.slotText,
                                                isSelected && styles.slotTextSelected,
                                            ]}>
                                                {slot.time}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}
                </>
            ) : (
                <Text style={styles.hint}>👆 Select a date above to see available slots.</Text>
            )}

            {/* Selected slot summary */}
            {selectedSlot != null ? (
                <View style={styles.summaryBox}>
                    <View style={styles.summaryLeft}>
                        <Text style={styles.summaryTitle}>Selected Slot</Text>
                        <Text style={styles.summaryDate}>📅 {selectedDate}</Text>
                        <Text style={styles.summaryTime}>🕐 {selectedSlot.time}</Text>
                        {bikeDetails.trim() ? (
                            <Text style={styles.summaryBike}>🛵 {bikeDetails}</Text>
                        ) : null}
                    </View>
                    <TouchableOpacity
                        style={styles.clearSlot}
                        onPress={() => setSelectedSlot(null)}
                    >
                        <Text style={styles.clearSlotText}>✕</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* Submit button */}
            {selectedSlot != null ? (
                <TouchableOpacity
                    style={[styles.submitBtn, booking && styles.submitBtnDisabled]}
                    onPress={submitBooking}
                    disabled={booking}
                    activeOpacity={0.88}
                >
                    {booking ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.submitBtnText}>Send Booking Request</Text>
                            <Text style={styles.submitBtnArrow}>→</Text>
                        </>
                    )}
                </TouchableOpacity>
            ) : null}

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 16 },
    garageName: { fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 4 },

    label: {
        fontSize: 15, fontWeight: '600',
        marginTop: 20, marginBottom: 10, color: '#333'
    },
    input: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
        padding: 14, fontSize: 15, color: '#222',
        backgroundColor: '#fafafa',
    },

    infoBox: {
        backgroundColor: '#f5f5f5', borderRadius: 12,
        padding: 16, marginTop: 8, alignItems: 'center'
    },
    infoText: { color: '#888', fontSize: 14 },

    noteBox: {
        backgroundColor: '#FEF9C3', borderRadius: 10,
        padding: 12, marginBottom: 14,
        borderWidth: 1, borderColor: '#FEF08A'
    },
    noteText: { color: '#854D0E', fontSize: 13, lineHeight: 18 },

    // Slot grid
    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    slotBtn: {
        borderWidth: 1.5, borderColor: '#ddd',
        borderRadius: 10, paddingVertical: 12,
        paddingHorizontal: 16, backgroundColor: '#f9f9f9',
        flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    slotBtnSelected: {
        borderColor: '#FF6B35',
        backgroundColor: '#FFF3EF',
    },
    slotCheckmark: { color: '#FF6B35', fontWeight: 'bold', fontSize: 13 },
    slotText: { color: '#444', fontWeight: '600', fontSize: 15 },
    slotTextSelected: { color: '#FF6B35' },

    // Summary card
    summaryBox: {
        marginTop: 24,
        backgroundColor: '#FFF3EF',
        borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: '#FFD9C7',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    summaryLeft: { gap: 4 },
    summaryTitle: { fontSize: 13, fontWeight: '700', color: '#FF6B35', marginBottom: 4 },
    summaryDate: { fontSize: 14, color: '#555' },
    summaryTime: { fontSize: 14, color: '#555' },
    summaryBike: { fontSize: 13, color: '#888' },
    clearSlot: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#FFD9C7',
        justifyContent: 'center', alignItems: 'center',
    },
    clearSlotText: { color: '#FF6B35', fontWeight: 'bold', fontSize: 13 },

    // Submit button
    submitBtn: {
        backgroundColor: '#FF6B35', borderRadius: 14,
        padding: 18, marginTop: 16, marginBottom: 20,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 10,
    },
    submitBtnDisabled: { backgroundColor: '#ffb899' },
    submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    submitBtnArrow: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

    hint: { color: '#aaa', textAlign: 'center', marginTop: 24, fontSize: 14 },
});
