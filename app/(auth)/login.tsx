import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator
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
    const setUser = useAuthStore((s) => s.setUser);
    const router = useRouter();
    const { toast, showToast, hideToast } = useToast();

    const handleLogin = async () => {
        if (!email.trim()) { showToast('Please enter your email.', 'warning'); return; }
        if (!password.trim()) { showToast('Please enter your password.', 'warning'); return; }

        setLoading(true);
        try {
            const { user } = await loginUser(email.trim(), password);
            setUser(user!);
        } catch (e: any) {
            // ── Parse every shape Django can return ──────────────────────
            const msg =
                e?.response?.data?.detail ??  // "No active account found..."
                e?.response?.data?.non_field_errors?.[0] ??  // DRF default
                e?.response?.data?.email?.[0] ??  // field-level
                e?.response?.data?.password?.[0] ??
                (e?.response?.status === 401
                    ? 'Wrong email or password. Please try again.'
                    : 'Something went wrong. Please try again.');

            showToast(msg, 'error');
        } finally {
            setLoading(false);   // ← ALWAYS runs, clears the spinner
        }
    };



    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔧 BikeService</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
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
            <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
                {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Login</Text>
                }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.link}>New here? Create an account</Text>
            </TouchableOpacity>

            <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
    title: { fontSize: 36, fontWeight: 'bold', color: '#FF6B35', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
    input: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
        padding: 14, marginBottom: 14, fontSize: 15, color: '#222'
    },
    btn: { backgroundColor: '#FF6B35', padding: 16, borderRadius: 12, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    link: { textAlign: 'center', color: '#FF6B35', marginTop: 20, fontSize: 15 },
});
