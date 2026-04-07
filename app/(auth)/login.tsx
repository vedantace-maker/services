// app/(auth)/login.tsx

import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { loginUser } from '../../utils/services/authService';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { setAuth } = useAuthStore();       // ← was setUser, now setAuth
    const router = useRouter();
    const { toast, showToast, hideToast } = useToast();

    const handleLogin = async () => {
        if (!email.trim()) { showToast('Please enter your email.', 'warning'); return; }
        if (!password.trim()) { showToast('Please enter your password.', 'warning'); return; }

        setLoading(true);
        try {
            const res = await loginUser(email.trim(), password);

            // ✅ token comes from res.token, NOT res.user.token
            setAuth(res.token ?? '', res.user!);

            if (res.user?.role === 'owner') {
                router.replace('/(owner)' as any);
            } else {
                router.replace('/(customer)/home' as any);
            }
        } catch (e: any) {
            const msg =
                e?.response?.data?.detail ??
                e?.response?.data?.non_field_errors?.[0] ??
                e?.response?.data?.email?.[0] ??
                e?.response?.data?.password?.[0] ??
                (e?.response?.status === 401
                    ? 'Wrong email or password. Please try again.'
                    : 'Something went wrong. Please try again.');

            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{'🔧 BikeService'}</Text>
            <Text style={styles.subtitle}>{'Sign in to continue'}</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#aaa"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#aaa"
            />

            <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
            >
                {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>{'Login'}</Text>
                }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
                <Text style={styles.link}>{'New here? Create an account'}</Text>
            </TouchableOpacity>

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={hideToast}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
    title: { fontSize: 36, fontWeight: 'bold', color: '#FF6B35', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
    input: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
        padding: 14, marginBottom: 14, fontSize: 15, color: '#222',
    },
    btn: { backgroundColor: '#FF6B35', padding: 16, borderRadius: 12, alignItems: 'center' },
    btnDisabled: { opacity: 0.65 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    link: { textAlign: 'center', color: '#FF6B35', marginTop: 20, fontSize: 15 },
});