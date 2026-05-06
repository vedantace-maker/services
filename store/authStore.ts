// // store/authStore.ts

import { AppUser } from '../types';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
// import { teardownPushNotifications, setupPushNotifications } from '../utils/notifications';
import { teardownPushNotifications } from '../utils/services/notificationService';

interface AuthState {
    user: AppUser | null;
    token: string | null;
    isHydrated: boolean;
    hydrate: () => Promise<void>;
    setAuth: (token: string, user: AppUser) => void;
    logout: () => Promise<void>;
    updateUser: (partial: Partial<AppUser>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isHydrated: false,   // ← starts false

    hydrate: async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const userRaw = await SecureStore.getItemAsync('user');
            if (token && userRaw) {
                set({ token, user: JSON.parse(userRaw) });
            }
        } catch (e) {
            // non-critical — clear state and continue
            set({ token: null, user: null });
        } finally {
            // ✅ ALWAYS set isHydrated true — even on error
            // Without this, the app loads forever
            set({ isHydrated: true });
        }
    },

    setAuth: async (token, user) => {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));
        set({ token, user });
    },

    logout: async () => {
        teardownPushNotifications();
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        set({ token: null, user: null });
    },

    updateUser: async (partial) => {
        const updated = { ...get().user!, ...partial };
        await SecureStore.setItemAsync('user', JSON.stringify(updated));
        set({ user: updated });
    },
}));