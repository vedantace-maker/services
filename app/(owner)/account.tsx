import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, Alert, ScrollView, ActivityIndicator
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { logoutUser } from '../../utils/dummyAuth';
import { getGarageById, saveGarage } from '../../utils/storage';
import { Garage } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OwnerAccount() {
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);

    const [garage, setGarage] = useState<Garage | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [garageName, setGarageName] = useState('');
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user?.uid) {
            getGarageById(user.uid).then((g) => {
                if (g) {
                    setGarage(g);
                    setGarageName(g.name);
                    setAddress(g.address);
                    setLat(g.latitude.toString());
                    setLon(g.longitude.toString());
                }
            });
        }
    }, []);

    const handleLogout = async () => {
        await logoutUser();
        setUser(null);
    };

    const handleSave = async () => {
        if (!name.trim() || !phone.trim() || !garageName.trim() || !address.trim() || !lat || !lon) {
            Alert.alert('Error', 'All fields are required.');
            return;
        }
        setSaving(true);
        try {
            const raw = await AsyncStorage.getItem('@bikeservice_users');
            const users = raw ? JSON.parse(raw) : [];
            const idx = users.findIndex((u: any) => u.uid === user!.uid);
            if (idx >= 0) {
                users[idx].name = name.trim();
                users[idx].phone = phone.trim();
                await AsyncStorage.setItem('@bikeservice_users', JSON.stringify(users));
            }

            const currentRaw = await AsyncStorage.getItem('@bikeservice_current_user');
            if (currentRaw) {
                const current = JSON.parse(currentRaw);
                current.name = name.trim();
                current.phone = phone.trim();
                await AsyncStorage.setItem('@bikeservice_current_user', JSON.stringify(current));
            }

            if (garage) {
                const updatedGarage: Garage = {
                    ...garage,
                    name: garageName.trim(),
                    address: address.trim(),
                    phone: phone.trim(),
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon),
                };
                await saveGarage(updatedGarage);
                setGarage(updatedGarage);
            }

            setUser({ ...user!, name: name.trim(), phone: phone.trim() });
            setEditMode(false);
            Alert.alert('✅ Saved', 'Account and garage details updated.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const bikeServices = garage?.services?.bike ?? [];
    const scootyServices = garage?.services?.scooty ?? [];

    return (
        <ScrollView contentContainerStyle={styles.container}>

            {/* Avatar */}
            <View style={styles.avatarBox}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user?.name?.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.roleTag}>🔧 Garage Owner</Text>
            </View>

            {/* Personal Info */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Personal Information</Text>

                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Full Name</Text>
                    {editMode ? (
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor="#aaa"
                        />
                    ) : (
                        <Text style={styles.fieldValue}>{user?.name}</Text>
                    )}
                </View>
                <View style={styles.divider} />

                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <Text style={styles.fieldValue}>{user?.email}</Text>
                    <Text style={styles.fieldHint}>Email cannot be changed</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Phone</Text>
                    {editMode ? (
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            placeholderTextColor="#aaa"
                        />
                    ) : (
                        <Text style={styles.fieldValue}>{user?.phone ?? 'Not set'}</Text>
                    )}
                </View>
            </View>

            {/* Garage Info */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Garage Information</Text>

                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Garage Name</Text>
                    {editMode ? (
                        <TextInput
                            style={styles.input}
                            value={garageName}
                            onChangeText={setGarageName}
                            placeholderTextColor="#aaa"
                        />
                    ) : (
                        <Text style={styles.fieldValue}>{garage?.name ?? '—'}</Text>
                    )}
                </View>
                <View style={styles.divider} />

                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Address</Text>
                    {editMode ? (
                        <TextInput
                            style={styles.input}
                            value={address}
                            onChangeText={setAddress}
                            placeholderTextColor="#aaa"
                        />
                    ) : (
                        <Text style={styles.fieldValue}>{garage?.address ?? '—'}</Text>
                    )}
                </View>
                <View style={styles.divider} />

                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Latitude</Text>
                    {editMode ? (
                        <TextInput
                            style={styles.input}
                            value={lat}
                            onChangeText={setLat}
                            keyboardType="numeric"
                            placeholderTextColor="#aaa"
                        />
                    ) : (
                        <Text style={styles.fieldValue}>
                            {garage?.latitude != null ? garage.latitude.toString() : '—'}
                        </Text>
                    )}
                </View>
                <View style={styles.divider} />

                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Longitude</Text>
                    {editMode ? (
                        <TextInput
                            style={styles.input}
                            value={lon}
                            onChangeText={setLon}
                            keyboardType="numeric"
                            placeholderTextColor="#aaa"
                        />
                    ) : (
                        <Text style={styles.fieldValue}>
                            {garage?.longitude != null ? garage.longitude.toString() : '—'}
                        </Text>
                    )}
                </View>
                <View style={styles.divider} />

                {/* Bike Services — uses ternary, never && with a number */}
                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Bike Services</Text>
                    <Text style={styles.fieldValue}>
                        {bikeServices.length > 0 ? `${bikeServices.length} services` : 'None added'}
                    </Text>
                    {bikeServices.length > 0 ? (
                        <Text style={styles.fieldHint}>{bikeServices.join(', ')}</Text>
                    ) : null}
                </View>
                <View style={styles.divider} />

                {/* Scooty Services — uses ternary, never && with a number */}
                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Scooty Services</Text>
                    <Text style={styles.fieldValue}>
                        {scootyServices.length > 0 ? `${scootyServices.length} services` : 'None added'}
                    </Text>
                    {scootyServices.length > 0 ? (
                        <Text style={styles.fieldHint}>{scootyServices.join(', ')}</Text>
                    ) : null}
                </View>
            </View>

            {/* Buttons */}
            {editMode ? (
                <View style={styles.btnRow}>
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => {
                            setName(user?.name ?? '');
                            setPhone(user?.phone ?? '');
                            setGarageName(garage?.name ?? '');
                            setAddress(garage?.address ?? '');
                            setLat(garage?.latitude?.toString() ?? '');
                            setLon(garage?.longitude?.toString() ?? '');
                            setEditMode(false);
                        }}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.saveBtnText}>Save Changes</Text>
                        }
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
                    <Text style={styles.editBtnText}>✏️  Edit Profile & Garage</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: '#f9f9f9', flexGrow: 1 },
    avatarBox: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontSize: 34, fontWeight: 'bold', color: '#fff' },
    roleTag: {
        marginTop: 10, backgroundColor: '#FFF3EF', paddingHorizontal: 14,
        paddingVertical: 4, borderRadius: 20, color: '#FF6B35', fontWeight: '600',
    },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 16 },
    field: { paddingVertical: 4 },
    fieldLabel: { fontSize: 12, color: '#aaa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldValue: { fontSize: 16, color: '#222' },
    fieldHint: { fontSize: 12, color: '#bbb', marginTop: 2 },
    input: {
        borderWidth: 1, borderColor: '#FF6B35', borderRadius: 8,
        padding: 10, fontSize: 15, color: '#222', backgroundColor: '#FFF9F7'
    },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
    btnRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    cancelBtn: {
        flex: 1, borderWidth: 1, borderColor: '#ddd',
        padding: 14, borderRadius: 12, alignItems: 'center'
    },
    cancelBtnText: { color: '#888', fontWeight: '600' },
    saveBtn: { flex: 1, backgroundColor: '#FF6B35', padding: 14, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: 'bold' },
    editBtn: {
        borderWidth: 1, borderColor: '#FF6B35', padding: 14,
        borderRadius: 12, alignItems: 'center', marginBottom: 12
    },
    editBtnText: { color: '#FF6B35', fontWeight: '600', fontSize: 15 },
    logoutBtn: {
        borderWidth: 1, borderColor: '#ddd', padding: 14,
        borderRadius: 12, alignItems: 'center', marginBottom: 40
    },
    logoutText: { color: '#999', fontWeight: '600' },
});
