import { DaySchedule, Weekday } from '../../types';

const WEEKDAY_INDEX: Record<Weekday, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
};

function formatHour(h: number): string {
    if (h === 0) return '12:00 AM';
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return '12:00 PM';
    return `${h - 12}:00 PM`;
}

// Returns next N calendar dates that fall on open weekdays
export function getAvailableDates(
    schedule: DaySchedule[],
    daysAhead: number = 14
): { date: string; label: string; weekday: Weekday }[] {
    const openDays = new Set(
        schedule.filter((s) => s.isOpen).map((s) => WEEKDAY_INDEX[s.day])
    );

    const result: { date: string; label: string; weekday: Weekday }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= daysAhead; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);

        if (openDays.has(d.getDay())) {
            const weekday = Object.keys(WEEKDAY_INDEX).find(
                (k) => WEEKDAY_INDEX[k as Weekday] === d.getDay()
            ) as Weekday;

            result.push({
                date: d.toISOString().split('T')[0],   // "2026-03-20"
                label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
                weekday,
            });
        }
    }
    return result;
}

// Returns time slots for a given weekday config
export function getSlotsForDay(s: DaySchedule): string[] {
    if (!s.isOpen) return [];
    const slots: string[] = [];
    for (let h = s.startHour; h < s.endHour; h += s.intervalMinutes / 60) {
        slots.push(formatHour(Math.floor(h)));
    }
    return slots;
}
