export type UserRole = 'customer' | 'owner';

export interface AppUser {
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    phone?: string;
}

export interface TimeSlot {
    id: string;
    time: string;
    isBooked: boolean;
    bookedBy?: string;
    bookedByName?: string;
}

export interface DaySchedule {
    date: string;
    slots: TimeSlot[];
    isOpen: boolean;
}

export interface GarageServices {
    bike: string[];
    scooty: string[];
}

export interface Garage {
    id: string;
    ownerUid: string;
    name: string;
    address: string;
    phone: string;
    latitude: number;
    longitude: number;
    services: GarageServices;
    schedule: DaySchedule[];
    distanceKm?: number;
}

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

export interface Booking {
    id: string;
    customerUid: string;
    customerName: string;
    garageId: string;
    garageName: string;
    date: string;
    time: string;
    status: BookingStatus;
    createdAt: number;
    bikeDetails?: string;
    serviceStartedAt?: number;
    estimatedDurationMin?: number;
    completedAt?: number;
    rejectionNote?: string;
}
