export type UserRole = 'customer' | 'owner';

export interface AppUser {
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    address?: string;
    phone?: string;
}

export interface TimeSlot {
    id: string;
    time: string;
    isBooked: boolean;
    bookedBy?: string;
    bookedByName?: string;
}

export interface GarageServices {
    bike: string[];
    scooty: string[];
}

// export interface Garage {
//     id: string;
//     ownerUid: string;
//     name: string;
//     address: string;
//     phone: string;
//     latitude: number;
//     longitude: number;
//     services: GarageServices;
//     schedule: DaySchedule[];
//     distanceKm?: number;
// }
export type Garage = {
    id: string;
    name: string;
    address: string;
    phone: string;
    latitude?: number;
    longitude?: number;
    distanceKm?: number;
    services?: {
        bike?: string[];
        scooty?: string[];
    };
    service_prices?: {
        bike: Record<string, number>;
        scooty: Record<string, number>;
    };
    schedule?: DaySchedule[];   // ← comes nested from Django
};

// ─── Booking status flow ───────────────────────────────────────────────────
// pending → accepted → in_progress → completed
//         ↘ rejected
export type BookingStatus =
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'in_progress'
    | 'completed'
    | 'cancelled';


export type Booking = {
    id: number;
    customer: string;
    customer_name: string;
    customer_phone: string;
    garage: string;      // UUID
    garage_name: string;
    garage_address: string;
    garage_phone: string;
    date: string;      // "2026-03-20"
    time: string;      // "09:00"   ← was time_slot
    vehicle_type: 'bike' | 'scooty';
    bike_details: string;      // vehicle model  ← was service
    selected_services: string;      // service name
    status: BookingStatus;
    note?: string;
    rejection_note?: string;
    created_at: string;
    updated_at: string;

    // ── add these billing fields (all optional) ───────────────────────────
    // ── billing (serializer field names → map to invoice) ─────────────────
    services_subtotal?: number;        // → use as subtotal
    platform_fee?: number;
    delivery_charge?: number;
    gst?: number;        // → use as gst_amount
    cess?: number;        // → use as cess_amount
    grand_total?: number;        // → use as total_amount
    discount?: number;
    promo_code?: string;
    payment_status?: string;
    payment_method?: string;
    service_items?: { name: string; price: number | null }[];

    // // ✅ Delivery location — all optional so old call sites don't break
    delivery_address?: string;
    delivery_latitude?: number | null;
    delivery_longitude?: number | null;
};

// export interface DaySchedule {
//     day: string;
//     date?: string;       // used when schedule is per-date (customer booking)
//     isOpen: boolean;
//     slots: TimeSlot[];

//     // ← Add these three fields
//     startHour?: number;       // 0–23, e.g. 9 = 09:00
//     endHour?: number;       // 0–23, e.g. 18 = 18:00
//     intervalMinutes?: number;       // 30 | 60 | 120
// }

export type Weekday =
    | 'Monday' | 'Tuesday' | 'Wednesday'
    | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type DaySchedule = {
    day: Weekday;
    isOpen: boolean;
    startHour: number;   // 0–23
    endHour: number;   // 0–23
    intervalMinutes: number;   // 30 | 60 | 90 | 120
};
