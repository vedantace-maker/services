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
