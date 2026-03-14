import AsyncStorage from '@react-native-async-storage/async-storage';
import { Garage, Booking, DaySchedule } from '../types';

const GARAGES_KEY = '@bikeservice_garages';
const BOOKINGS_KEY = '@bikeservice_bookings';

// ─── Garages ──────────────────────────────────────────────────────────

export async function getAllGarages(): Promise<Garage[]> {
    const raw = await AsyncStorage.getItem(GARAGES_KEY);
    return raw ? JSON.parse(raw) : [];
}

export async function saveGarage(garage: Garage): Promise<void> {
    const garages = await getAllGarages();
    const idx = garages.findIndex((g) => g.id === garage.id);
    if (idx >= 0) garages[idx] = garage;
    else garages.push(garage);
    await AsyncStorage.setItem(GARAGES_KEY, JSON.stringify(garages));
}

export async function getGarageById(id: string): Promise<Garage | null> {
    const garages = await getAllGarages();
    return garages.find((g) => g.id === id) ?? null;
}

export async function updateGarageSchedule(
    garageId: string,
    schedule: DaySchedule[]
): Promise<void> {
    const garages = await getAllGarages();
    const idx = garages.findIndex((g) => g.id === garageId);
    if (idx >= 0) {
        garages[idx].schedule = schedule;
        await AsyncStorage.setItem(GARAGES_KEY, JSON.stringify(garages));
    }
}

// ─── Bookings ─────────────────────────────────────────────────────────

export async function getAllBookings(): Promise<Booking[]> {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
}

export async function addBooking(booking: Booking): Promise<void> {
    const bookings = await getAllBookings();
    bookings.push(booking);
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

export async function getBookingsByCustomer(customerUid: string): Promise<Booking[]> {
    const bookings = await getAllBookings();
    return bookings
        .filter((b) => b.customerUid === customerUid)
        .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getBookingsByGarage(garageId: string): Promise<Booking[]> {
    const bookings = await getAllBookings();
    return bookings
        .filter((b) => b.garageId === garageId)
        .sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateBookingStatus(
    bookingId: string,
    status: Booking['status']
): Promise<void> {
    const bookings = await getAllBookings();
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx >= 0) {
        bookings[idx].status = status;
        await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    }
}

// Add this function at the bottom of utils/storage.ts
export async function updateBookingFields(
    bookingId: string,
    fields: Partial<Booking>
): Promise<void> {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    const bookings: Booking[] = raw ? JSON.parse(raw) : [];
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx >= 0) {
        bookings[idx] = { ...bookings[idx], ...fields };
        await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    }
}
