// utils/api.ts

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = 
// 'http://13.202.113.121:4000/api/v1';
    // process.env.EXPO_PUBLIC_API_BASE_URL 
    // ??
    'http://192.168.1.203:8000/api/v1';   // ← fallback if .env is missing
       // ← fallback if .env is missing

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
    (error) => Promise.reject(error)
);

// ─── Response interceptor — auto refresh on 401 ──────────────────────────────
let isRefreshing = false;
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

        if (error.response?.status !== 401 || original._retry) {
            return Promise.reject(error);
        }

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

            const { data } = await axios.post(
                `${BASE_URL}/auth/token/refresh/`,
                { refresh },
                { headers: { 'Content-Type': 'application/json' } }
            );

            await SecureStore.setItemAsync('access_token', data.access);

            if (data.refresh) {
                await SecureStore.setItemAsync('refresh_token', data.refresh);
            }

            original.headers.Authorization = `Bearer ${data.access}`;
            processQueue(null, data.access);
            return api(original);

        } catch (refreshError) {
            processQueue(refreshError, null);
            await SecureStore.deleteItemAsync('access_token');
            await SecureStore.deleteItemAsync('refresh_token');
            await SecureStore.deleteItemAsync('auth_user');   // ← also clear stored user
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;