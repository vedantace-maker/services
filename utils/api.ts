import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = 'http://192.168.1.201:8000/api/v1';

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)   // ← was missing — handles request setup errors
);

// ─── Response interceptor — auto refresh on 401 ──────────────────────────────
let isRefreshing = false;   // ← prevents multiple simultaneous refresh calls
let failedQueue: {
    resolve: (token: string) => void;
    reject: (err: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        // Not a 401 or already retried — reject immediately
        if (error.response?.status !== 401 || original._retry) {
            return Promise.reject(error);
        }

        // If a refresh is already in flight, queue this request
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((token) => {
                    original.headers.Authorization = `Bearer ${token}`;
                    return api(original);
                })
                .catch((err) => Promise.reject(err));
        }

        original._retry = true;
        isRefreshing = true;

        try {
            const refresh = await SecureStore.getItemAsync('refresh_token');

            if (!refresh) throw new Error('No refresh token stored');

            // Use plain axios — not the intercepted instance — to avoid infinite loop
            const { data } = await axios.post(
                `${BASE_URL}/auth/token/refresh/`,
                { refresh },
                { headers: { 'Content-Type': 'application/json' } }
            );

            await SecureStore.setItemAsync('access_token', data.access);

            // djangorestframework-simplejwt also rotates refresh token if ROTATE_REFRESH_TOKENS = True
            if (data.refresh) {
                await SecureStore.setItemAsync('refresh_token', data.refresh);
            }

            original.headers.Authorization = `Bearer ${data.access}`;
            processQueue(null, data.access);
            return api(original);

        } catch (refreshError) {
            processQueue(refreshError, null);
            // Clear tokens — user must log in again
            await SecureStore.deleteItemAsync('access_token');
            await SecureStore.deleteItemAsync('refresh_token');
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
