// app/(auth)/register.tsx

import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput,
    TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { registerUser } from '../../utils/services/authService';
import { createGarage } from '../../utils/services/garageService';
import { useAuthStore } from '../../store/authStore';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

type Role = 'customer' | 'owner';

export default function RegisterScreen() {
    const router = useRouter();
    const { setAuth } = useAuthStore();          // ← was setUser, now setAuth
    const { toast, showToast, hideToast } = useToast();

    // ── Common fields ─────────────────────────────────────────────────
    const [role, setRole] = useState<Role>('customer');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');

    // ── Owner garage fields ───────────────────────────────────────────
    const [garageName, setGarageName] = useState('');
    const [garageAddress, setGarageAddress] = useState('');
    const [garagePhone, setGaragePhone] = useState('');

    // ── Location state ────────────────────────────────────────────────
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [locationLabel, setLocationLabel] = useState('');
    const [fetchingLocation, setFetchingLocation] = useState(false);

    const [loading, setLoading] = useState(false);
    const [secure, setSecure] = useState(true);

    // ── Fetch GPS location ────────────────────────────────────────────
    const handleFetchLocation = async () => {
        setFetchingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showToast('Location permission denied. Please enable it in Settings.', 'warning');
                return;
            }

            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const { latitude: lat, longitude: lng } = loc.coords;
            setLatitude(lat);
            setLongitude(lng);

            const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (place) {
                const parts = [
                    place.name, place.street, place.district, place.city, place.region,
                ].filter(Boolean);

                const fullAddress = parts.join(', ');
                if (!garageAddress.trim()) setGarageAddress(fullAddress);
                setLocationLabel(`${place.city ?? place.district}, ${place.region}`);
            } else {
                setLocationLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            }

            showToast('Location captured successfully.', 'success');
        } catch {
            showToast('Could not fetch location. Try again.', 'error');
        } finally {
            setFetchingLocation(false);
        }
    };

    // ── Validation ────────────────────────────────────────────────────
    const validate = (): string | null => {
        if (!name.trim()) return 'Full name is required.';
        if (!email.trim()) return 'Email is required.';
        if (!phone.trim()) return 'Phone number is required.';
        if (password.length < 8) return 'Password must be at least 8 characters.';
        if (password !== confirm) return 'Passwords do not match.';
        if (role === 'owner') {
            if (!garageName.trim()) return 'Garage name is required.';
            if (!garageAddress.trim()) return 'Garage address is required.';
            if (!garagePhone.trim()) return 'Garage phone is required.';
            if (!latitude || !longitude) return 'Please fetch your garage location.';
        }
        return null;
    };

    // ── Submit ────────────────────────────────────────────────────────
    const handleRegister = async () => {
        const err = validate();
        if (err) { showToast(err, 'warning'); return; }

        setLoading(true);
        try {
            // registerUser saves access + refresh + user to SecureStore internally
            const res = await registerUser(name, email, phone, password, role);

            // Create garage profile for owner before redirecting
            if (role === 'owner') {
                try {
                    await createGarage({
                        name: garageName.trim(),
                        address: garageAddress.trim(),
                        phone: garagePhone.trim(),
                        latitude: latitude!,
                        longitude: longitude!,
                    });
                } catch (garageErr: any) {
                    const msg =
                        garageErr?.response?.data?.detail ??
                        garageErr?.response?.data?.non_field_errors?.[0] ??
                        'Garage setup failed. You can update it in Account settings.';
                    showToast(msg, 'warning');
                }
            }

            // ✅ token comes from res.token, NOT res.user.token
            setAuth(res.token ?? '', res.user!);

            // Redirect based on role
            if (role === 'owner') {
                router.replace('/(owner)' as any);
            } else {
                router.replace('/(customer)/home' as any);
            }
        } catch (e: any) {
            const msg =
                e?.response?.data?.email?.[0] ??
                e?.response?.data?.detail ??
                e?.response?.data?.non_field_errors?.[0] ??
                'Registration failed. Please try again.';
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{'Create Account'}</Text>
                    <Text style={styles.subtitle}>{'Fill in your details to get started'}</Text>
                </View>

                {/* Role toggle */}
                <View style={styles.roleToggle}>
                    {(['customer', 'owner'] as Role[]).map((r) => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                            onPress={() => setRole(r)}
                        >
                            <Ionicons
                                name={r === 'owner' ? 'construct-outline' : 'person-outline'}
                                size={16}
                                color={role === r ? Colors.primary : Colors.textTertiary}
                            />
                            <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                                {r === 'owner' ? 'Garage Owner' : 'Customer'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Personal Info ──────────────────────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{'Personal Info'}</Text>
                    <Field icon="person-outline" placeholder="Full name" value={name} onChangeText={setName} />
                    <Field icon="mail-outline" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                    <Field icon="call-outline" placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

                    {/* Password with show/hide toggle */}
                    <View style={styles.fieldRow}>
                        <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} />
                        <TextInput
                            style={styles.fieldInput}
                            placeholder="Password (min 8 chars)"
                            placeholderTextColor={Colors.textTertiary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={secure}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity onPress={() => setSecure((v) => !v)}>
                            <Ionicons
                                name={secure ? 'eye-outline' : 'eye-off-outline'}
                                size={18}
                                color={Colors.textTertiary}
                            />
                        </TouchableOpacity>
                    </View>

                    <Field icon="lock-closed-outline" placeholder="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />
                </View>

                {/* ── Garage Info (owner only) ───────────────────────────── */}
                {role === 'owner' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{'Garage Details'}</Text>

                        <View style={styles.garageNote}>
                            <Ionicons name="information-circle-outline" size={15} color="#92400E" />
                            <Text style={styles.garageNoteText}>
                                {'These details will be visible to customers when browsing.'}
                            </Text>
                        </View>

                        <Field icon="storefront-outline" placeholder="Garage name" value={garageName} onChangeText={setGarageName} />
                        <Field icon="location-outline" placeholder="Full address" value={garageAddress} onChangeText={setGarageAddress} />
                        <Field icon="call-outline" placeholder="Garage contact number" value={garagePhone} onChangeText={setGaragePhone} keyboardType="phone-pad" />

                        {/* ── Location picker ───────────────────────────────── */}
                        <View style={styles.locationSection}>
                            <Text style={styles.locationLabel}>{'Garage Location (GPS)'}</Text>

                            {latitude && longitude ? (
                                <View style={styles.locationCaptured}>
                                    <View style={styles.locationCapturedLeft}>
                                        <View style={styles.locationDot} />
                                        <View>
                                            <Text style={styles.locationCapturedTitle}>{'Location Captured'}</Text>
                                            <Text style={styles.locationCapturedSub}>{locationLabel}</Text>
                                            <Text style={styles.locationCoords}>
                                                {latitude.toFixed(5) + ', ' + longitude.toFixed(5)}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.refetchBtn}
                                        onPress={handleFetchLocation}
                                        disabled={fetchingLocation}
                                    >
                                        <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.fetchBtn, fetchingLocation && styles.fetchBtnDisabled]}
                                    onPress={handleFetchLocation}
                                    disabled={fetchingLocation}
                                    activeOpacity={0.85}
                                >
                                    {fetchingLocation ? (
                                        <>
                                            <ActivityIndicator size="small" color={Colors.primary} />
                                            <Text style={styles.fetchBtnText}>{'Fetching location...'}</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="navigate-outline" size={18} color={Colors.primary} />
                                            <Text style={styles.fetchBtnText}>{'Use My Current Location'}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}

                            <Text style={styles.locationHint}>
                                {'Your GPS coordinates help customers find you on the map and sort garages by distance.'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleRegister}
                    disabled={loading}
                    activeOpacity={0.88}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.submitBtnText}>{'Create Account'}</Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>

                {/* Login link */}
                <View style={styles.loginRow}>
                    <Text style={styles.loginText}>{'Already have an account?'}</Text>
                    <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)}>
                        <Text style={styles.loginLink}>{'Sign in'}</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
        </View>
    );
}

// ── Reusable field component ──────────────────────────────────────────────────
function Field({ icon, placeholder, value, onChangeText, keyboardType, secureTextEntry, autoCapitalize }: {
    icon: any;
    placeholder: string;
    value: string;
    onChangeText: (v: string) => void;
    keyboardType?: any;
    secureTextEntry?: boolean;
    autoCapitalize?: any;
}) {
    return (
        <View style={styles.fieldRow}>
            <Ionicons name={icon} size={18} color={Colors.textTertiary} />
            <TextInput
                style={styles.fieldInput}
                placeholder={placeholder}
                placeholderTextColor={Colors.textTertiary}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                secureTextEntry={secureTextEntry}
                autoCapitalize={autoCapitalize ?? 'words'}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Spacing.md, gap: Spacing.sm, paddingTop: 60, paddingBottom: 40 },
    header: { gap: 4, marginBottom: Spacing.sm },
    title: { ...Typography.h1, color: Colors.textPrimary },
    subtitle: { ...Typography.body, color: Colors.textTertiary },

    roleToggle: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: 4 },
    roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: Radius.md },
    roleBtnActive: { backgroundColor: Colors.surface, ...Shadow.sm },
    roleBtnText: { ...Typography.body, color: Colors.textTertiary, fontWeight: '500' },
    roleBtnTextActive: { color: Colors.primary, fontWeight: '700' },

    card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm, ...Shadow.sm },
    cardTitle: { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },

    garageNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, backgroundColor: Colors.warningLight, borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: '#FDE68A' },
    garageNoteText: { ...Typography.caption, color: '#92400E', flex: 1 },

    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bg, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 13, borderWidth: 1, borderColor: Colors.border },
    fieldInput: { ...Typography.body, flex: 1, color: Colors.textPrimary },

    locationSection: { gap: Spacing.sm },
    locationLabel: { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6 },
    fetchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed', backgroundColor: Colors.primaryLight },
    fetchBtnDisabled: { opacity: 0.6 },
    fetchBtnText: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
    locationCaptured: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: '#BBF7D0' },
    locationCapturedLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
    locationDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
    locationCapturedTitle: { ...Typography.body, color: Colors.success, fontWeight: '700' },
    locationCapturedSub: { ...Typography.caption, color: '#065F46', marginTop: 2 },
    locationCoords: { fontSize: 10, color: '#065F46', marginTop: 2, fontWeight: '600' },
    refetchBtn: { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary },
    locationHint: { ...Typography.caption, color: Colors.textTertiary, fontStyle: 'italic' },

    submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
    submitBtnDisabled: { backgroundColor: Colors.primary + '80' },
    submitBtnText: { ...Typography.button, color: '#fff' },

    loginRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
    loginText: { ...Typography.body, color: Colors.textTertiary },
    loginLink: { ...Typography.body, color: Colors.primary, fontWeight: '700' },
});