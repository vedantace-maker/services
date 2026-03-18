import api from '../api';
import { Booking } from '../../types';

export async function createBooking(payload: {
    garage: string;
    service: string;
    vehicle_type: 'bike' | 'scooty';
    date: string;   // "2026-03-20"
    time_slot: string;   // "9:00 AM"
}): Promise<Booking> {
    const { data } = await api.post('/bookings/', payload);
    return data;
}
