// app/(owner)/account.tsx

import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, ActivityIndicator, Modal, FlatList, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { logoutUser } from '../../utils/services/authService';
import { Garage } from '../../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import * as Location from 'expo-location';
import { getMyGarage, updateGarageInfo } from '../../utils/services/garageService';

// ── Full service catalogue ────────────────────────────────────────────────────
const BIKE_CATALOGUE = [
    'Oil Change', 'Full Service', 'Chain & Sprocket', 'Brake Adjustment',
    'Air Filter Clean', 'Engine Tune-up', 'Carburetor Clean', 'Clutch Repair',
    'Gear Adjustment', 'Spark Plug', 'Wheel Alignment', 'Suspension Check',
    'Battery Check', 'Battery Replacement', 'Headlight Fix', 'Body Work',
    'Coolant Flush', 'Tyre Puncture Fix', 'Nitrogen Fill', 'Foam Wash',
];

const SCOOTY_CATALOGUE = [
    'Belt Change', 'CVT Service', 'Oil Change', 'Full Service',
    'Brake Adjustment', 'Air Filter Clean', 'Spark Plug', 'Battery Check',
    'Battery Replacement', 'Tyre Puncture Fix', 'Nitrogen Fill',
    'Body Work', 'Headlight Fix', 'Suspension Check', 'Wheel Alignment',
    'Foam Wash', 'Coolant Flush', 'Engine Tune-up', 'Fuel Injector Clean',
];

// ── Service Picker Modal ──────────────────────────────────────────────────────
function ServicePickerModal({
    visible, title, catalogue, selected, onDone, onClose,
}: {
    visible: boolean; title: string; catalogue: string[];
    selected: string[]; onDone: (services: string[]) => void; onClose: () => void;
}) {
    const [current, setCurrent] = useState<string[]>(selected);

    React.useEffect(() => {
        if (visible) setCurrent(selected);
    }, [visible]);

    const toggle = (s: string) =>
        setCurrent((prev) =>
            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
        );

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={pickerStyles.backdrop}>
                <View style={pickerStyles.sheet}>
                    <View style={pickerStyles.header}>
                        <Text style={pickerStyles.title}>{title}</Text>
                        <TouchableOpacity style={pickerStyles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={pickerStyles.hint}>
                        {String(current.length) + ' service' + (current.length !== 1 ? 's' : '') + ' selected'}
                    </Text>

                    <FlatList
                        data={catalogue}
                        keyExtractor={(s) => s}
                        style={pickerStyles.list}
                        renderItem={({ item }) => {
                            const checked = current.includes(item);
                            return (
                                <TouchableOpacity
                                    style={[pickerStyles.row, checked && pickerStyles.rowActive]}
                                    onPress={() => toggle(item)}
                                    activeOpacity={0.75}
                                >
                                    <View style={[pickerStyles.checkbox, checked && pickerStyles.checkboxActive]}>
                                        {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                                    </View>
                                    <Text style={[pickerStyles.rowText, checked && pickerStyles.rowTextActive]}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />

                    <View style={pickerStyles.footer}>
                        <TouchableOpacity
                            style={pickerStyles.doneBtn}
                            onPress={() => { onDone(current); onClose(); }}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={pickerStyles.doneBtnText}>
                                {'Confirm ' + String(current.length) + ' Services'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const pickerStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%', paddingBottom: 32, ...Shadow.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    title: { ...Typography.h2, color: Colors.textPrimary },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    hint: { ...Typography.caption, color: Colors.textTertiary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    list: { paddingHorizontal: Spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    rowActive: { backgroundColor: Colors.primaryLight, marginHorizontal: -Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
    checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    rowText: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
    rowTextActive: { color: Colors.primary, fontWeight: '600' },
    footer: { padding: Spacing.md, paddingTop: Spacing.sm },
    doneBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    doneBtnText: { ...Typography.button, color: '#fff' },
});

// ── SectionCard ───────────────────────────────────────────────────────────────
function SectionCard({
    title, icon, editing, onEdit, onSave, onCancel, saving, children,
}: {
    title: string; icon: any; editing: boolean;
    onEdit: () => void; onSave: () => void; onCancel: () => void;
    saving: boolean; children: React.ReactNode;
}) {
    return (
        <View style={cardStyles.wrap}>
            <View style={cardStyles.header}>
                <View style={cardStyles.iconBox}>
                    <Ionicons name={icon} size={16} color={Colors.textSecondary} />
                </View>
                <Text style={cardStyles.title}>{title}</Text>
                {!editing && (
                    <TouchableOpacity style={cardStyles.editBtn} onPress={onEdit}>
                        <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
                        <Text style={cardStyles.editBtnText}>{'Edit'}</Text>
                    </TouchableOpacity>
                )}
            </View>
            <View style={cardStyles.divider} />
            <View style={cardStyles.body}>{children}</View>
            {editing && (
                <View style={cardStyles.actions}>
                    <TouchableOpacity style={cardStyles.cancelBtn} onPress={onCancel}>
                        <Text style={cardStyles.cancelText}>{'Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={cardStyles.saveBtn} onPress={onSave} disabled={saving}>
                        {saving
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={cardStyles.saveText}>{'Save Changes'}</Text>
                        }
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ── InfoField ─────────────────────────────────────────────────────────────────
function InfoField({
    label, value, editing, onChangeText, keyboardType, multiline, isLast, placeholder,
}: {
    label: string; value: string; editing: boolean;
    onChangeText: (t: string) => void; keyboardType?: any;
    multiline?: boolean; isLast?: boolean; placeholder?: string;
}) {
    return (
        <View style={[fieldStyles.wrap, !isLast && fieldStyles.bordered]}>
            <Text style={fieldStyles.label}>{label}</Text>
            {editing ? (
                <TextInput
                    style={[fieldStyles.input, multiline && { minHeight: 64 }]}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType ?? 'default'}
                    multiline={multiline}
                    placeholder={placeholder ?? label}
                    placeholderTextColor={Colors.textTertiary}
                />
            ) : (
                <Text style={fieldStyles.value}>{value || '—'}</Text>
            )}
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function OwnerAccount() {
    const router = useRouter();

    // ✅ Single clean destructure — no setUser, no setAuth
    const { user, logout, updateUser } = useAuthStore();
    const { toast, showToast, hideToast } = useToast();

    const [garage, setGarage] = useState<Garage | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const [garageName, setGarageName] = useState('');
    const [address, setAddress] = useState('');
    const [garagePhone, setGaragePhone] = useState('');

    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [locationLabel, setLocationLabel] = useState('');
    const [fetchingLocation, setFetchingLocation] = useState(false);

    const [bikeServices, setBikeServices] = useState<string[]>([]);
    const [scootyServices, setScootyServices] = useState<string[]>([]);

    const [editProfile, setEditProfile] = useState(false);
    const [editGarage, setEditGarage] = useState(false);

    const [bikePickerOpen, setBikePickerOpen] = useState(false);
    const [scootyPickerOpen, setScootyPickerOpen] = useState(false);

    useFocusEffect(useCallback(() => { load(); }, []));

    const load = async () => {
        setLoading(true);
        try {
            const g = await getMyGarage();
            setGarage(g);
            setName(user!.name);
            setPhone(user!.phone ?? '');
            setGarageName(g.name);
            setAddress(g.address);
            setGaragePhone(g.phone);
            setBikeServices(g.services?.bike ?? []);
            setScootyServices(g.services?.scooty ?? []);

            if (g.latitude && g.longitude) {
                setLatitude(g.latitude);
                setLongitude(g.longitude);
                setLocationLabel(g.latitude.toFixed(5) + ', ' + g.longitude.toFixed(5));
            }
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Failed to load garage.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFetchLocation = async () => {
        setFetchingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showToast('Location permission denied. Enable it in Settings.', 'warning');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const { latitude: lat, longitude: lng } = loc.coords;
            setLatitude(lat);
            setLongitude(lng);

            const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (place) {
                const parts = [place.name, place.street, place.district, place.city, place.region].filter(Boolean);
                if (!address.trim()) setAddress(parts.join(', '));
                setLocationLabel((place.city ?? place.district ?? '') + ', ' + (place.region ?? ''));
            } else {
                setLocationLabel(lat.toFixed(5) + ', ' + lng.toFixed(5));
            }
            showToast('Location updated successfully.', 'success');
        } catch {
            showToast('Could not fetch location. Try again.', 'error');
        } finally {
            setFetchingLocation(false);
        }
    };

    // ── Save personal profile — uses updateUser instead of setUser ────────────
    const saveProfile = async () => {
        if (!name.trim() || !phone.trim()) {
            showToast('Name and phone cannot be empty.', 'error');
            return;
        }
        setSaving(true);
        try {
            // ✅ updateUser patches SecureStore + Zustand — no manual state juggling
            await updateUser({ name: name.trim(), phone: phone.trim() });
            setEditProfile(false);
            showToast('Profile updated successfully.', 'success');
        } catch (e: any) {
            showToast(e?.message ?? 'Failed to update profile.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const saveGarageInfo = async () => {
        if (!garageName.trim()) {
            showToast('Garage name cannot be empty.', 'error');
            return;
        }
        setSaving(true);
        try {
            const updated = await updateGarageInfo(garage?.id, {
                name: garageName.trim(),
                address: address.trim(),
                phone: garagePhone.trim(),
                latitude: latitude ?? undefined,
                longitude: longitude ?? undefined,
            });
            setGarage(updated);
            setEditGarage(false);
            showToast('Garage info updated.', 'success');
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Failed to update garage.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Logout ────────────────────────────────────────────────────────────────
    const handleLogout = () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logoutUser();   // blacklists token on backend
                        } catch {
                            // non-critical — still clear local state
                        } finally {
                            await logout();       // clears SecureStore + Zustand
                            // ✅ NO router.replace — _layout AuthGate handles redirect
                        }
                    },
                },
            ]
        );
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />;

    const totalServices = bikeServices.length + scootyServices.length;

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{'Account'}</Text>
                </View>

                {/* Avatar card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarBox}>
                        <Text style={styles.avatarText}>
                            {user?.name?.charAt(0).toUpperCase() ?? '?'}
                        </Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{user?.name ?? ''}</Text>
                        <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>{'Garage Owner'}</Text>
                        </View>
                    </View>
                </View>

                {/* Personal Info */}
                <SectionCard
                    title="Personal Info"
                    icon="person-outline"
                    editing={editProfile}
                    saving={saving}
                    onEdit={() => setEditProfile(true)}
                    onSave={saveProfile}
                    onCancel={() => {
                        setName(user!.name);
                        setPhone(user!.phone ?? '');
                        setEditProfile(false);
                    }}
                >
                    <InfoField label="Full Name" value={name} editing={editProfile} onChangeText={setName} />
                    <InfoField label="Phone Number" value={phone} editing={editProfile} onChangeText={setPhone} keyboardType="phone-pad" isLast />
                </SectionCard>

                {/* Garage Info */}
                <SectionCard
                    title="Garage Info"
                    icon="storefront-outline"
                    editing={editGarage}
                    saving={saving}
                    onEdit={() => setEditGarage(true)}
                    onSave={saveGarageInfo}
                    onCancel={() => {
                        setGarageName(garage!.name);
                        setAddress(garage!.address);
                        setGaragePhone(garage!.phone);
                        setEditGarage(false);
                    }}
                >
                    <InfoField label="Garage Name" value={garageName} editing={editGarage} onChangeText={setGarageName} />
                    <InfoField label="Address" value={address} editing={editGarage} onChangeText={setAddress} multiline />
                    <InfoField label="Phone" value={garagePhone} editing={editGarage} onChangeText={setGaragePhone} keyboardType="phone-pad" isLast={!editGarage} />

                    {editGarage && (
                        <View style={styles.locationSection}>
                            <Text style={styles.locationFieldLabel}>{'Garage Location (GPS)'}</Text>

                            {latitude && longitude ? (
                                <View style={styles.locationCaptured}>
                                    <View style={styles.locationCapturedLeft}>
                                        <View style={styles.locationDot} />
                                        <View>
                                            <Text style={styles.locationCapturedTitle}>{'Location Set'}</Text>
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
                                        {fetchingLocation
                                            ? <ActivityIndicator size="small" color={Colors.primary} />
                                            : <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                                        }
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
                                            <Text style={styles.fetchBtnText}>{'Update Current Location'}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}

                            <Text style={styles.locationHint}>
                                {'Updating location helps customers find your garage by distance.'}
                            </Text>
                        </View>
                    )}
                </SectionCard>

                {/* Services Offered */}
                <View style={cardStyles.wrap}>
                    <View style={cardStyles.header}>
                        <View style={cardStyles.iconBox}>
                            <Ionicons name="construct-outline" size={16} color={Colors.textSecondary} />
                        </View>
                        <Text style={cardStyles.title}>{'Services Offered'}</Text>
                        <TouchableOpacity
                            style={cardStyles.editBtn}
                            onPress={() => router.push('/(owner)/edit-services' as any)}
                        >
                            <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
                            <Text style={cardStyles.editBtnText}>{'Manage'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={cardStyles.divider} />
                    <View style={cardStyles.body}>

                        <View style={styles.serviceSection}>
                            <View style={styles.serviceSectionHeader}>
                                <View style={[styles.serviceTypeIcon, { backgroundColor: Colors.infoLight }]}>
                                    <Ionicons name="bicycle-outline" size={14} color={Colors.info} />
                                </View>
                                <Text style={styles.serviceTypeLabel}>{'Bike Services'}</Text>
                                <Text style={styles.serviceTypeCount}>{String(bikeServices.length)}</Text>
                            </View>
                            <View style={styles.chipsWrap}>
                                {bikeServices.length === 0 ? (
                                    <Text style={styles.noServicesText}>{'No bike services added yet.'}</Text>
                                ) : (
                                    bikeServices.slice(0, 6).map((s) => (
                                        <View key={s} style={[styles.chip, { backgroundColor: Colors.infoLight }]}>
                                            <Text style={[styles.chipText, { color: Colors.info }]}>{s}</Text>
                                        </View>
                                    ))
                                )}
                                {bikeServices.length > 6 && (
                                    <View style={[styles.chip, { backgroundColor: Colors.surfaceAlt }]}>
                                        <Text style={[styles.chipText, { color: Colors.textSecondary }]}>
                                            {'+' + String(bikeServices.length - 6) + ' more'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={[styles.serviceSection, { paddingBottom: 0 }]}>
                            <View style={styles.serviceSectionHeader}>
                                <View style={[styles.serviceTypeIcon, { backgroundColor: '#F5F3FF' }]}>
                                    <Ionicons name="speedometer-outline" size={14} color="#6D28D9" />
                                </View>
                                <Text style={styles.serviceTypeLabel}>{'Scooty Services'}</Text>
                                <Text style={styles.serviceTypeCount}>{String(scootyServices.length)}</Text>
                            </View>
                            <View style={styles.chipsWrap}>
                                {scootyServices.length === 0 ? (
                                    <Text style={styles.noServicesText}>{'No scooty services added yet.'}</Text>
                                ) : (
                                    scootyServices.slice(0, 6).map((s) => (
                                        <View key={s} style={[styles.chip, { backgroundColor: '#F5F3FF' }]}>
                                            <Text style={[styles.chipText, { color: '#6D28D9' }]}>{s}</Text>
                                        </View>
                                    ))
                                )}
                                {scootyServices.length > 6 && (
                                    <View style={[styles.chip, { backgroundColor: Colors.surfaceAlt }]}>
                                        <Text style={[styles.chipText, { color: Colors.textSecondary }]}>
                                            {'+' + String(scootyServices.length - 6) + ' more'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.manageServicesBtn}
                            onPress={() => router.push('/(owner)/edit-services' as any)}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="settings-outline" size={16} color={Colors.primary} />
                            <Text style={styles.manageServicesBtnText}>
                                {'Manage Services & Pricing  (' + String(totalServices) + ' active)'}
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={18} color={Colors.error} />
                    <Text style={styles.logoutText}>{'Log Out'}</Text>
                </TouchableOpacity>

            </ScrollView>

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={hideToast}
            />
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const cardStyles = StyleSheet.create({
    wrap: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm, overflow: 'hidden', marginHorizontal: Spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
    iconBox: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    title: { ...Typography.h3, color: Colors.textPrimary, flex: 1 },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
    editBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
    divider: { height: 1, backgroundColor: Colors.borderLight },
    body: { padding: Spacing.md, paddingTop: 0 },
    actions: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, paddingTop: 0 },
    cancelBtn: { flex: 1, padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
    cancelText: { ...Typography.buttonSm, color: Colors.textSecondary },
    saveBtn: { flex: 1, padding: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
    saveText: { ...Typography.buttonSm, color: '#fff' },
});

const fieldStyles = StyleSheet.create({
    wrap: { paddingTop: Spacing.md },
    bordered: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight, paddingBottom: Spacing.md },
    label: { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    input: { ...Typography.body, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.sm, padding: Spacing.sm, backgroundColor: Colors.primaryLight },
    value: { ...Typography.body, color: Colors.textPrimary },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { paddingBottom: 40, gap: Spacing.sm },

    header: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    title: { ...Typography.h1, color: Colors.textPrimary },

    profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm, marginHorizontal: Spacing.md },
    avatarBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
    profileInfo: { flex: 1 },
    profileName: { ...Typography.h3, color: Colors.textPrimary },
    profileEmail: { ...Typography.body, color: Colors.textSecondary, marginTop: 3 },
    roleBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: Colors.infoLight, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
    roleBadgeText: { ...Typography.overline, color: Colors.info, fontWeight: '600' },

    serviceSection: { paddingTop: Spacing.md, paddingBottom: Spacing.md },
    serviceSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    serviceTypeIcon: { width: 26, height: 26, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    serviceTypeLabel: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600', flex: 1 },
    serviceTypeCount: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '600' },

    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
    chipText: { ...Typography.caption, fontWeight: '600' },
    noServicesText: { ...Typography.caption, color: Colors.textTertiary, fontStyle: 'italic' },
    divider: { height: 1, backgroundColor: Colors.borderLight },

    manageServicesBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '40' },
    manageServicesBtnText: { ...Typography.body, color: Colors.primary, fontWeight: '600', flex: 1 },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.errorLight, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: '#FECACA', marginHorizontal: Spacing.md },
    logoutText: { ...Typography.button, color: Colors.error },

    locationSection: { gap: Spacing.sm, marginTop: Spacing.md },
    locationFieldLabel: { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6 },
    fetchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed', backgroundColor: Colors.primaryLight },
    fetchBtnDisabled: { opacity: 0.6 },
    fetchBtnText: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
    locationCaptured: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: '#BBF7D0' },
    locationCapturedLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
    locationDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
    locationCapturedTitle: { ...Typography.body, color: Colors.success, fontWeight: '700' },
    locationCapturedSub: { ...Typography.caption, color: '#065F46', marginTop: 2 },
    locationCoords: { ...Typography.overline, color: '#065F46', marginTop: 2 },
    refetchBtn: { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary },
    locationHint: { ...Typography.caption, color: Colors.textTertiary, fontStyle: 'italic' },
});