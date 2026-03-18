import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, ActivityIndicator
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { logoutUser } from '../../utils/services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function CustomerAccount() {
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const { toast, showToast, hideToast } = useToast();

    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [saving, setSaving] = useState(false);

    const handleLogout = () => {
        showToast('Logging out...', 'info');
        setTimeout(async () => {
            await logoutUser();
            setUser(null);
        }, 1000);
    };

    const handleSave = async () => {
        if (!name.trim() || !phone.trim()) {
            showToast('Name and phone cannot be empty.', 'error');
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
            setUser({ ...user!, name: name.trim(), phone: phone.trim() });
            setEditMode(false);
            showToast('Profile updated successfully.', 'success');
        } catch (e: any) {
            showToast(e.message ?? 'Failed to update profile.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const MENU_ITEMS = [
        { icon: 'notifications-outline' as const, label: 'Notifications', sub: 'Manage alerts & reminders' },
        { icon: 'shield-checkmark-outline' as const, label: 'Privacy & Security', sub: 'Password and data settings' },
        { icon: 'help-circle-outline' as const, label: 'Help & Support', sub: 'FAQs and contact support' },
        { icon: 'information-circle-outline' as const, label: 'About MotoBee', sub: 'Version 1.0.0' },
    ];

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Account</Text>
                </View>

                {/* Profile card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarBox}>
                        <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        {editMode ? (
                            <>
                                <TextInput style={styles.inlineInput} value={name} onChangeText={setName} placeholderTextColor={Colors.textTertiary} />
                                <TextInput style={[styles.inlineInput, { marginTop: Spacing.xs }]} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={Colors.textTertiary} />
                            </>
                        ) : (
                            <>
                                <Text style={styles.profileName}>{user?.name}</Text>
                                <Text style={styles.profileEmail}>{user?.email}</Text>
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleBadgeText}>Customer</Text>
                                </View>
                            </>
                        )}
                    </View>
                    {!editMode && (
                        <TouchableOpacity style={styles.editIconBtn} onPress={() => setEditMode(true)}>
                            <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Edit actions */}
                {editMode && (
                    <View style={styles.editRow}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => {
                                setName(user?.name ?? '');
                                setPhone(user?.phone ?? '');
                                setEditMode(false);
                            }}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                            {saving
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.saveBtnText}>Save Changes</Text>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                {/* Info rows */}
                <View style={styles.card}>
                    {[
                        { icon: 'call-outline' as const, label: 'Phone', value: user?.phone ?? 'Not set' },
                        { icon: 'mail-outline' as const, label: 'Email', value: user?.email ?? '' },
                    ].map((item, idx, arr) => (
                        <View key={item.label}>
                            <View style={styles.infoRow}>
                                <View style={styles.infoIconBox}>
                                    <Ionicons name={item.icon} size={16} color={Colors.textSecondary} />
                                </View>
                                <View style={styles.infoText}>
                                    <Text style={styles.infoLabel}>{item.label}</Text>
                                    <Text style={styles.infoValue}>{item.value}</Text>
                                </View>
                            </View>
                            {idx < arr.length - 1 && <View style={styles.divider} />}
                        </View>
                    ))}
                </View>

                {/* Menu */}
                <View style={styles.card}>
                    {MENU_ITEMS.map((item, idx, arr) => (
                        <View key={item.label}>
                            <TouchableOpacity style={styles.menuRow}>
                                <View style={styles.menuIconBox}>
                                    <Ionicons name={item.icon} size={17} color={Colors.textSecondary} />
                                </View>
                                <View style={styles.menuText}>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    <Text style={styles.menuSub}>{item.sub}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                            </TouchableOpacity>
                            {idx < arr.length - 1 && <View style={styles.divider} />}
                        </View>
                    ))}
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={18} color={Colors.error} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Toast */}
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
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { paddingBottom: 40, gap: Spacing.sm },

    header: {
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 56, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    title: { ...Typography.h1, color: Colors.textPrimary },

    profileCard: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: Colors.surface, padding: Spacing.md,
        borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
        ...Shadow.sm, marginHorizontal: Spacing.md,
    },
    avatarBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
    profileInfo: { flex: 1 },
    profileName: { ...Typography.h3, color: Colors.textPrimary },
    profileEmail: { ...Typography.body, color: Colors.textSecondary, marginTop: 3 },
    roleBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
    roleBadgeText: { ...Typography.overline, color: Colors.primary, fontWeight: '600' },
    editIconBtn: { padding: Spacing.sm },
    inlineInput: {
        ...Typography.body, color: Colors.textPrimary,
        borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.sm,
        paddingHorizontal: Spacing.sm, paddingVertical: 7,
        backgroundColor: Colors.primaryLight,
    },

    editRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' },
    cancelBtnText: { ...Typography.button, color: Colors.textSecondary },
    saveBtn: { flex: 1, backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' },
    saveBtnText: { ...Typography.button, color: '#fff' },

    card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, marginHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm, overflow: 'hidden' },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.md },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
    infoIconBox: { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    infoText: { flex: 1 },
    infoLabel: { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { ...Typography.body, color: Colors.textPrimary, marginTop: 2 },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
    menuIconBox: { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    menuText: { flex: 1 },
    menuLabel: { ...Typography.body, color: Colors.textPrimary, fontWeight: '500' },
    menuSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },

    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, marginHorizontal: Spacing.md,
        backgroundColor: Colors.errorLight, padding: Spacing.md,
        borderRadius: Radius.lg, borderWidth: 1, borderColor: '#FECACA',
    },
    logoutText: { ...Typography.button, color: Colors.error },
});
