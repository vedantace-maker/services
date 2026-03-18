import * as SecureStore from 'expo-secure-store';
import api from './api';
import { AppUser } from '../types';

// ─── Keys ─────────────────────────────────────────────────────────────────────
const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'current_user';

// ─── Register ─────────────────────────────────────────────────────────────────
export async function registerUser(userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'customer' | 'owner';
    garageName?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
}): Promise<{ success: boolean; user?: AppUser; message: string }> {
    try {
        const { data } = await api.post('/auth/register/', {
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            password: userData.password,
            role: userData.role,
            garage_name: userData.garageName,
            address: userData.address,
            latitude: userData.latitude,
            longitude: userData.longitude,
        });

        // Save tokens
        await SecureStore.setItemAsync(ACCESS_KEY, data.access);
        await SecureStore.setItemAsync(REFRESH_KEY, data.refresh);

        // Normalize user object
        const user: AppUser = {
            uid: data.user.uid,
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone,
            role: data.user.role,
        };

        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
        return { success: true, user, message: 'Registered successfully.' };
    } catch (error: any) {
        const msg =
            error.response?.data?.detail ??
            error.response?.data?.email?.[0] ??
            error.response?.data?.message ??
            Object.values(error.response?.data ?? {})?.[0] ??
            'Registration failed. Please try again.';
        return { success: false, message: String(msg) };
    }
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function loginUser(
    email: string,
    password: string
): Promise<{ success: boolean; user?: AppUser; message: string }> {
    try {
        const { data } = await api.post('/auth/login/', { email, password });

        // Save tokens
        await SecureStore.setItemAsync(ACCESS_KEY, data.access);
        await SecureStore.setItemAsync(REFRESH_KEY, data.refresh);

        // Normalize user object
        const user: AppUser = {
            uid: data.user.uid,
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone,
            role: data.user.role,
        };

        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
        return { success: true, user, message: 'Login successful.' };
    } catch (error: any) {
        const msg =
            error.response?.data?.detail ??
            error.response?.data?.non_field_errors?.[0] ??
            error.response?.data?.message ??
            'Invalid email or password.';
        return { success: false, message: String(msg) };
    }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
    try {
        const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
        if (refresh) await api.post('/auth/logout/', { refresh });
    } catch {
        // Silently fail — still clear local tokens
    } finally {
        await SecureStore.deleteItemAsync(ACCESS_KEY);
        await SecureStore.deleteItemAsync(REFRESH_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
    }
}

// ─── Get stored user (on app boot) ───────────────────────────────────────────
export async function getStoredUser(): Promise<AppUser | null> {
    try {
        const raw = await SecureStore.getItemAsync(USER_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AppUser;
    } catch {
        return null;
    }
}
