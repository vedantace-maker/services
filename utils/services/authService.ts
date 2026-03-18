import * as SecureStore from 'expo-secure-store';
import api from '../api';
import { AppUser } from '../../types';

type AuthResponse = {
    success: boolean;
    user?: AppUser;
    message: string;
};

// ── Login ─────────────────────────────────────────────────────────────────────
export async function loginUser(
    email: string,
    password: string
): Promise<AuthResponse> {
    try {
        const { data } = await api.post('/auth/login/', { email, password });

        await SecureStore.setItemAsync('access_token', data.access);
        await SecureStore.setItemAsync('refresh_token', data.refresh);

        return { success: true, user: data.user as AppUser, message: 'Login successful.' };
    } catch (e) {
        throw e;   // ← must re-throw so login.tsx catch block receives it
    }
}


// ── Register ──────────────────────────────────────────────────────────────────
export async function registerUser(
    name: string,
    email: string,
    phone: string,
    password: string,
    role: 'owner' | 'customer'
): Promise<AuthResponse> {
    const { data } = await api.post('/auth/register/', {
        name, email, phone, password, role,
    });

    // Save tokens immediately so post-register calls (e.g. createGarage) work
    await SecureStore.setItemAsync('access_token', data.access);
    await SecureStore.setItemAsync('refresh_token', data.refresh);

    return {
        success: true,
        user: data.user as AppUser,
        message: 'Registration successful.',
    };
}

// ── Logout ────────────────────────────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
    try {
        const refresh = await SecureStore.getItemAsync('refresh_token');
        if (refresh) {
            await api.post('/auth/logout/', { refresh });
        }
    } catch {
        // Blacklist failure is non-critical — still clear local tokens
    } finally {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
    }
}
