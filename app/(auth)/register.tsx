import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { registerUser } from '../../utils/dummyAuth';
import { saveGarage } from '../../utils/storage';
import { generateId } from '../../utils/helpers';
import { UserRole } from '../../types';

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('customer');
    const [garageName, setGarageName] = useState('');
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [loading, setLoading] = useState(false);

    const setUser = useAuthStore((s) => s.setUser);
    const router = useRouter();

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password || !phone.trim()) {
            Alert.alert('Error', 'Please fill all required fields.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters.');
            return;
        }
        if (role === 'owner' && (!garageName.trim() || !address.trim() || !lat || !lon)) {
            Alert.alert('Error', 'Please fill all garage details.');
            return;
        }

        setLoading(true);
        const uid = generateId();

        const result = await registerUser({
            uid,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            role,
            password,
        });

        if (!result.success) {
            setLoading(false);
            Alert.alert('Registration Failed', result.message);
            return;
        }

        if (role === 'owner') {
            await saveGarage({
                id: uid,
                ownerUid: uid,
                name: garageName.trim(),
                address: address.trim(),
                phone: phone.trim(),
                latitude: parseFloat(lat),
                longitude: parseFloat(lon),
                services: {
                    bike: ['Oil Change', 'Chain & Sprocket Service', 'Brake Adjustment', 'Full Service'],
                    scooty: ['Oil Change', 'Belt Change', 'Brake Adjustment', 'Full Service'],
                },
                schedule: [],
            });
        }

        setLoading(false);
        setUser({ uid, name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), role });
    };

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>🔧 BikeService</Text>
            <Text style={styles.subtitle}>Create Account</Text>

            <View style={styles.roleRow}>
                {(['customer', 'owner'] as UserRole[]).map((r) => (
                    <TouchableOpacity
                        key={r}
                        style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                        onPress={() => setRole(r)}
                    >
                        <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                            {r === 'customer' ? '🛵 Customer' : '🔧 Garage Owner'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} placeholderTextColor="#aaa" />
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#aaa" />
            <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#aaa" />
            <TextInput style={styles.input} placeholder="Password (min. 6 characters)" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#aaa" />
            <TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholderTextColor="#aaa" />

            {role === 'owner' && (
                <>
                    <Text style={styles.sectionLabel}>Garage Details</Text>
                    <TextInput style={styles.input} placeholder="Garage Name" value={garageName} onChangeText={setGarageName} placeholderTextColor="#aaa" />
                    <TextInput style={styles.input} placeholder="Full Address" value={address} onChangeText={setAddress} placeholderTextColor="#aaa" />
                    <TextInput style={styles.input} placeholder="Latitude (e.g. 21.1458)" value={lat} onChangeText={setLat} keyboardType="numeric" placeholderTextColor="#aaa" />
                    <TextInput style={styles.input} placeholder="Longitude (e.g. 79.0882)" value={lon} onChangeText={setLon} keyboardType="numeric" placeholderTextColor="#aaa" />
                    <Text style={styles.hint}>💡 Long-press your location on Google Maps to get coordinates.</Text>
                </>
            )}

            <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.link}>Already have an account? Login</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#FF6B35', textAlign: 'center', marginTop: 40 },
    subtitle: { fontSize: 18, color: '#333', textAlign: 'center', marginBottom: 24 },
    roleRow: { flexDirection: 'row', marginBottom: 20, gap: 10 },
    roleBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 2, borderColor: '#ddd', alignItems: 'center' },
    roleBtnActive: { borderColor: '#FF6B35', backgroundColor: '#FFF3EF' },
    roleBtnText: { color: '#888', fontWeight: '600' },
    roleBtnTextActive: { color: '#FF6B35' },
    sectionLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 10, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 15, color: '#222' },
    hint: { color: '#aaa', fontSize: 12, marginBottom: 12 },
    btn: { backgroundColor: '#FF6B35', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    link: { textAlign: 'center', color: '#FF6B35', marginTop: 16, fontSize: 15, marginBottom: 40 },
});
