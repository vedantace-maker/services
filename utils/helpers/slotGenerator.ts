import { DaySchedule, Weekday } from '../../types';

const WEEKDAY_INDEX: Record<Weekday, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
};

// ── Format total minutes → "9:00 AM" / "9:30 AM" / "12:00 PM" ────────────────
function formatTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const period = h < 12 ? 'AM' : 'PM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const displayMin = m.toString().padStart(2, '0');
    return `${displayHour}:${displayMin} ${period}`;
}

// ── Returns time slots for a given weekday config ─────────────────────────────
// Uses minute-based arithmetic to avoid floating point issues
export function getSlotsForDay(s: DaySchedule): string[] {
    if (!s.isOpen) return [];

    const startMins = (s.startHour ?? 9) * 60;
    const endMins = (s.endHour ?? 18) * 60;
    const intervalMin = s.intervalMinutes ?? 60;

    if (endMins <= startMins) return [];

    const slots: string[] = [];
    for (let mins = startMins; mins < endMins; mins += intervalMin) {
        slots.push(formatTime(mins));
    }
    return slots;
}

// ── Returns next N calendar dates that fall on open weekdays ──────────────────
export function getAvailableDates(
    schedule: DaySchedule[],
    daysAhead: number = 14
): { date: string; label: string; weekday: Weekday }[] {
    if (!schedule?.length) return [];

    const openDayNumbers = new Set(
        schedule
            .filter((s) => s.isOpen)
            .map((s) => WEEKDAY_INDEX[s.day])
    );

    const result: { date: string; label: string; weekday: Weekday }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= daysAhead; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);

        const dayNumber = d.getDay();
        if (!openDayNumbers.has(dayNumber)) continue;

        const weekday = (Object.keys(WEEKDAY_INDEX) as Weekday[]).find(
            (k) => WEEKDAY_INDEX[k] === dayNumber
        )!;

        result.push({
            date: d.toISOString().split('T')[0],
            label: d.toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short',
            }),
            weekday,
        });
    }
    return result;
}
