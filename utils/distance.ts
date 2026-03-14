import { getDistance } from 'geolib';
import { TimeSlot } from '../types';

export function getDistanceKm(
    userLat: number, userLon: number,
    targetLat: number, targetLon: number
): number {
    const meters = getDistance(
        { latitude: userLat, longitude: userLon },
        { latitude: targetLat, longitude: targetLon }
    );
    return parseFloat((meters / 1000).toFixed(1));
}

export function generateTimeSlots(
    startHour: number = 9,
    endHour: number = 18,
    intervalMinutes: number = 60
): TimeSlot[] {
    const slots: TimeSlot[] = [];
    let current = startHour * 60;
    const end = endHour * 60;
    while (current < end) {
        const h = Math.floor(current / 60).toString().padStart(2, '0');
        const m = (current % 60).toString().padStart(2, '0');
        slots.push({ id: `${h}${m}`, time: `${h}:${m}`, isBooked: false });
        current += intervalMinutes;
    }
    return slots;
}
