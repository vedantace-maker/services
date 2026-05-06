import { create } from 'zustand';
import {
    locationProfileService,
    LocationProfile,
    CreateLocationProfile,
} from '../utils/services/locationProfileService';

interface LocationState {
    profiles: LocationProfile[];
    activeProfile: LocationProfile | null;  // currently selected delivery location
    hydrated: boolean;
    loading: boolean;
    error: string;

    // Actions
    fetchProfiles: () => Promise<void>;
    addProfile: (data: CreateLocationProfile) => Promise<LocationProfile>;
    updateProfile: (id: number, data: Partial<CreateLocationProfile>) => Promise<void>;
    deleteProfile: (id: number) => Promise<void>;
    setActiveProfile: (profile: LocationProfile) => void;
    reset: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
    profiles: [],
    activeProfile: null,
    hydrated: false,
    loading: false,
    error: '',

    // ── Fetch all profiles from backend ───────────────────────────────────────
    fetchProfiles: async () => {
        set({ loading: true, error: '' });
        try {
            const profiles = await locationProfileService.getAll();
            const current = get().activeProfile;

            // Re-sync activeProfile in case it was updated
            const refreshedActive = current
                ? profiles.find((p) => p.id === current.id) ?? profiles[0] ?? null
                : profiles[0] ?? null;

            set({ profiles, activeProfile: refreshedActive, hydrated: true });
        } catch {
            set({ error: 'Failed to load locations.', hydrated: true });
        } finally {
            set({ loading: false });
        }
    },

    // ── Add new profile ───────────────────────────────────────────────────────
    addProfile: async (data) => {
        const created = await locationProfileService.create(data);
        set((state) => ({
            profiles: [...state.profiles, created],
            // Auto-set as active if it's the first one
            activeProfile: state.profiles.length === 0 ? created : state.activeProfile,
        }));
        return created;
    },

    // ── Update existing profile ───────────────────────────────────────────────
    updateProfile: async (id, data) => {
        const updated = await locationProfileService.update(id, data);
        set((state) => ({
            profiles: state.profiles.map((p) => (p.id === id ? updated : p)),
            // Keep activeProfile in sync if it was the one edited
            activeProfile:
                state.activeProfile?.id === id ? updated : state.activeProfile,
        }));
    },

    // ── Delete profile ────────────────────────────────────────────────────────
    deleteProfile: async (id) => {
        await locationProfileService.remove(id);
        set((state) => {
            const profiles = state.profiles.filter((p) => p.id !== id);
            const activeProfile =
                state.activeProfile?.id === id
                    ? profiles[0] ?? null   // fallback to first remaining
                    : state.activeProfile;
            return { profiles, activeProfile };
        });
    },

    // ── Set active delivery location ──────────────────────────────────────────
    setActiveProfile: (profile) => set({ activeProfile: profile }),

    // ── Reset on logout ───────────────────────────────────────────────────────
    reset: () => set({
        profiles: [], activeProfile: null, hydrated: false, loading: false, error: '',
    }),
}));