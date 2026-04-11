import api from '../api';
import { Booking } from '../../types';

export type OwnerStatus = 'accepted' | 'rejected' | 'in_progress' | 'completed';

// ── Customer ──────────────────────────────────────────────────────────────────

export async function createBooking(payload: {
    // ── Booking fields ────────────────────────────────────────────────────
    garage: string;
    date: string;
    time: string;
    vehicle_type: 'bike' | 'scooty';
    bike_details: string;
    selected_services: string;
    note?: string;
    // estimated_price: number;

    // ── Billing fields ────────────────────────────────────────────────────
    manifest_id: string;
    services_subtotal: number;
    platform_fee: number;
    delivery_charge: number;
    discount: number;
    promo_code: string;
    gst: number;
    cess: number;
    grand_total: number;
    payment_status: string;
    payment_method: string;
}): Promise<Booking> {
    const { data } = await api.post('/bookings/', payload);   // ✅ full payload forwarded
    return data;
}

export async function getMyBookings(statusFilter?: string): Promise<Booking[]> {
    const params = statusFilter ? { status: statusFilter } : {};
    const { data } = await api.get('/bookings/mine/', { params });
    return Array.isArray(data) ? data : data.results ?? [];
}

// PATCH /bookings/{id}/cancel/
export async function cancelBooking(bookingId: string | number): Promise<Booking> {
    const { data } = await api.patch(`/bookings/${bookingId}/cancel/`);
    return data;
}

// ── Owner ─────────────────────────────────────────────────────────────────────

export async function getGarageBookings(
    statusFilter?: string,
    dateFilter?: string,
): Promise<Booking[]> {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (dateFilter) params.date = dateFilter;
    const { data } = await api.get('/bookings/garage/', { params });
    return Array.isArray(data) ? data : data.results ?? [];
}

// PATCH /bookings/{id}/accept/
export async function acceptBooking(bookingId: string | number): Promise<Booking> {
    const { data } = await api.patch(`/bookings/${bookingId}/accept/`);
    return data;
}

// PATCH /bookings/{id}/reject/
export async function rejectBooking(
    bookingId: string | number,
    rejection_note?: string,
): Promise<Booking> {
    const { data } = await api.patch(`/bookings/${bookingId}/reject/`, {
        rejection_note: rejection_note ?? '',
    });
    return data;
}

// PATCH /bookings/{id}/start/
export async function startBooking(bookingId: string | number): Promise<Booking> {
    const { data } = await api.patch(`/bookings/${bookingId}/start/`);
    return data;
}

// PATCH /bookings/{id}/complete/
export async function completeBooking(bookingId: string | number): Promise<Booking> {
    const { data } = await api.patch(`/bookings/${bookingId}/complete/`);
    return data;
}

// PATCH /bookings/{id}/duration/
export async function setBookingDuration(
    bookingId: string | number,
    durationMinutes: number,
): Promise<Booking> {
    const { data } = await api.patch(`/bookings/${bookingId}/duration/`, {
        duration: durationMinutes,
    });
    return data;
}

export async function getBookingDetail(bookingId: string | number): Promise<Booking> {
    const { data } = await api.get(`/bookings/${bookingId}/`);
    return data;
}

// GET /bookings/booked-slots/?garage=<id>&date=<YYYY-MM-DD>
export async function getBookedSlots(
    garageId: string,
    date: string,
): Promise<string[]> {
    const { data } = await api.get('/bookings/booked-slots/', {
        params: { garage: garageId, date },
    });
    return data?.booked_slots ?? [];
}