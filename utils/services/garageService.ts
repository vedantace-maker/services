import api from '../api';
import { Garage, DaySchedule } from '../../types';

// ─── Customer ────────────────────────────────────────────────────────────────

export async function getAllGarages(): Promise<Garage[]> {
    const { data } = await api.get('/garages/');
    return data;
}

export async function getGarageById(id: string): Promise<Garage> {
    const { data } = await api.get(`/garages/${id}/`);
    return data;
}

// ─── Owner ───────────────────────────────────────────────────────────────────

export async function getMyGarage(): Promise<Garage> {
    // Returns the garage owned by the authenticated user.
    // Django creates one automatically on first login if it doesn't exist.
    const { data } = await api.get('/garages/mine/');
    return data;
}

// export async function updateGarageInfo(id: any, payload: {
//     name?: string;
//     address?: string;
//     phone?: string;
// }): Promise<Garage> {
//     const { data } = await api.patch(`/garages/${id}/`, payload);
//     return data;
// }
export async function updateGarageInfo(id: any, payload: {
    name?: string;
    address?: string;
    phone?: string;
    latitude?: number;   // ← add
    longitude?: number;   // ← add
}): Promise<Garage> {
    // const { data } = await api.patch(`/garages/${id}/`, payload);
    const { data } = await api.patch(`/garages/mine/`, payload);
    return data;
}



export async function updateGarageServices(id: any, payload: {
    bike_services?: string[];
    scooty_services?: string[];
}): Promise<Garage> {
    const { data } = await api.patch(`/garages/mine/services/`, payload);
    return data;
}

// export async function updateGarageSchedule(
//     schedule: DaySchedule[]
// ): Promise<Garage> {
//     const { data } = await api.patch('/garages/mine/schedule/', { schedule });
//     return data;
// }

// ── Add this function alongside existing ones ─────────────────────
export async function createGarage(payload: {
    name: string;
    address: string;
    phone: string;
    latitude?: number;   // ← add these
    longitude?: number;
}): Promise<Garage> {
    const { data } = await api.post('/garages/', payload);
    return data;
}

// GET /garages/{garage_id}/schedule/
export async function getGarageSchedule(garageId: string | number): Promise<DaySchedule[]> {
    const { data } = await api.get(`/garages/${garageId}/schedule/`);
    return data;
}

// PATCH /garages/{garage_id}/schedule/
export async function updateGarageSchedule(
    garageId: string | number,
    schedule: DaySchedule[]
): Promise<Garage> {
    const { data } = await api.patch(`/garages/${garageId}/schedule/`, { schedule });
    return data;
}