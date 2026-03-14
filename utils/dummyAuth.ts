import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppUser } from '../types';

const USERS_KEY = '@bikeservice_users';
const CURRENT_USER_KEY = '@bikeservice_current_user';

export async function getAllUsers(): Promise<(AppUser & { password: string })[]> {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
}

export async function registerUser(
    userData: AppUser & { password: string }
): Promise<{ success: boolean; message: string }> {
    const users = await getAllUsers();
    if (users.find((u) => u.email === userData.email))
        return { success: false, message: 'Email is already registered.' };
    users.push(userData);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
    return { success: true, message: 'Registered successfully.' };
}

export async function loginUser(
    email: string,
    password: string
): Promise<{ success: boolean; user?: AppUser; message: string }> {
    const users = await getAllUsers();
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) return { success: false, message: 'Invalid email or password.' };
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
    const { password: _, ...user } = found;
    return { success: true, user: user as AppUser, message: 'Login successful.' };
}

export async function logoutUser(): Promise<void> {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
}

export async function getStoredUser(): Promise<AppUser | null> {
    const raw = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const { password: _, ...user } = JSON.parse(raw);
    return user as AppUser;
}
