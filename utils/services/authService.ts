import * as SecureStore from 'expo-secure-store';
import api from '../api';
import { AppUser } from '../../types';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'auth_user';

type AuthResponse = {
    success: boolean;
    user?: AppUser;
    message: string;
    token?: string;
};

// ── Persist helpers (used by authStore) ───────────────────────────────────────
export async function saveAuthData(
    access: string,
    refresh: string,
    user: AppUser
): Promise<void> {
    await Promise.all([
        SecureStore.setItemAsync(ACCESS_KEY, access),
        SecureStore.setItemAsync(REFRESH_KEY, refresh),
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
}

export async function getAuthToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getStoredUser(): Promise<AppUser | null> {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
}

export async function clearAuthData(): Promise<void> {
    await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_KEY),
        SecureStore.deleteItemAsync(REFRESH_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
    ]);
}

export async function updateStoredUser(partial: Partial<AppUser>): Promise<AppUser | null> {
    const current = await getStoredUser();
    if (!current) return null;
    const updated = { ...current, ...partial };
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
    return updated;
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function loginUser(
    email: string,
    password: string
): Promise<AuthResponse> {
    try {
        const { data } = await api.post('/auth/login/', { email, password });

        await saveAuthData(data.access, data.refresh, data.user as AppUser);

        return {
            success: true,
            user: data.user as AppUser,
            token: data.access,           // ← return token here
            message: 'Login successful.',
        };
    } catch (e) {
        throw e;
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

    await saveAuthData(data.access, data.refresh, data.user as AppUser);

    return {
        success: true,
        user: data.user as AppUser,
        token: data.access,               // ← return token here
        message: 'Registration successful.',
    };
}
// ── Logout ────────────────────────────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
    try {
        const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
        if (refresh) {
            await api.post('/auth/logout/', { refresh });
        }
    } catch {
        // Blacklist failure is non-critical — still clear local tokens
    } finally {
        await clearAuthData();
    }
}



// const handleLogin = async () => {
//     if (!email.trim())    { showToast('Please enter your email.',    'warning'); return; }
//     if (!password.trim()) { showToast('Please enter your password.', 'warning'); return; }

//     setLoading(true);
//     try {
//         const res = await loginUser(email.trim(), password);

//         // ✅ token comes from res.token, NOT res.user.token
//         setAuth(res.token ?? '', res.user!);

//         if (res.user?.role === 'owner') {
//             router.replace('/(owner)' as any);
//         } else {
//             router.replace('/(customer)/home' as any);
//         }
//     } catch (e: any) {
//         const msg =
//             e?.response?.data?.detail                 ??
//             e?.response?.data?.non_field_errors?.[0]  ??
//             e?.response?.data?.email?.[0]             ??
//             e?.response?.data?.password?.[0]          ??
//             (e?.response?.status === 401
//                 ? 'Wrong email or password. Please try again.'
//                 : 'Something went wrong. Please try again.');

//         showToast(msg, 'error');
//     } finally {
//         setLoading(false);
//     }
// };