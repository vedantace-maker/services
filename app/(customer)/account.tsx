// app/(customer)/account.tsx

import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { logoutUser } from '../../utils/services/authService';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function CustomerAccount() {
    const { user, logout, updateUser } = useAuthStore();   // ✅ no setUser
    const { toast, showToast, hideToast } = useToast();

    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [saving, setSaving] = useState(false);

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

    // ── Edit profile ──────────────────────────────────────────────────────────
    const handleOpenEdit = () => {
        setName(user?.name ?? '');
        setPhone(user?.phone ?? '');
        setEditMode(true);
    };

    const handleCancelEdit = () => {
        setName(user?.name ?? '');
        setPhone(user?.phone ?? '');
        setEditMode(false);
    };

    // ── Save profile — updates SecureStore + Zustand via updateUser ───────────
    const handleSave = async () => {
        if (!name.trim() || !phone.trim()) {
            showToast('Name and phone cannot be empty.', 'error');
            return;
        }
        setSaving(true);
        try {
            // ✅ updateUser patches SecureStore + Zustand — no AsyncStorage needed
            await updateUser({ name: name.trim(), phone: phone.trim() });
            setEditMode(false);
            showToast('Profile updated successfully.', 'success');
        } catch (e: any) {
            showToast(e?.message ?? 'Failed to update profile.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const MENU_SECTIONS = [
        {
            title: 'Activity',
            items: [
                { icon: 'receipt-outline' as const, label: 'Order History', sub: 'View all past bookings', route: '/(customer)/my-bookings', color: Colors.primary },
                { icon: 'car-sport-outline' as const, label: 'My Vehicles', sub: 'Manage your bikes & scooties', route: '/(customer)/my-vehicles', color: '#7C3AED' },
                { icon: 'gift-outline' as const, label: 'Refer & Earn', sub: 'Invite friends and earn rewards', route: '/(customer)/refer-earn', color: '#D97706' },
            ],
        },
        {
            title: 'Preferences',
            items: [
                { icon: 'notifications-outline' as const, label: 'Notifications', sub: 'Manage alerts & reminders', route: null, color: '#0891B2' },
                { icon: 'shield-checkmark-outline' as const, label: 'Privacy & Security', sub: 'Password and data settings', route: null, color: '#059669' },
            ],
        },
        {
            title: 'More',
            items: [
                { icon: 'help-circle-outline' as const, label: 'Help & Support', sub: 'FAQs and contact support', route: null, color: '#7C3AED' },
                { icon: 'information-circle-outline' as const, label: 'About MotoBee', sub: 'Version 1.0.0', route: '/(customer)/about' as any, color: Colors.textTertiary },
            ],
        },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: Colors.bg }}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ───────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <Text style={styles.title}>{'Account'}</Text>
                </View>

                {/* ── Profile card ─────────────────────────────────────────── */}
                <View style={styles.profileSection}>
                    <View style={styles.profileCard}>
                        <View style={styles.avatarBox}>
                            <Text style={styles.avatarText}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </Text>
                        </View>

                        <View style={styles.profileInfo}>
                            {editMode ? (
                                <>
                                    <TextInput
                                        style={styles.inlineInput}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Full name"
                                        placeholderTextColor={Colors.textTertiary}
                                    />
                                    <TextInput
                                        style={[styles.inlineInput, { marginTop: Spacing.xs }]}
                                        value={phone}
                                        onChangeText={setPhone}
                                        placeholder="Phone number"
                                        keyboardType="phone-pad"
                                        placeholderTextColor={Colors.textTertiary}
                                    />
                                </>
                            ) : (
                                <>
                                    <Text style={styles.profileName}>{user?.name}</Text>
                                    <Text style={styles.profileEmail}>{user?.email}</Text>
                                    <View style={styles.roleBadge}>
                                        <Text style={styles.roleBadgeText}>{'Customer'}</Text>
                                    </View>
                                </>
                            )}
                        </View>

                        {!editMode && (
                            <TouchableOpacity style={styles.editIconBtn} onPress={handleOpenEdit}>
                                <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* ── Save / Cancel — edit mode only ───────────────────── */}
                    {editMode && (
                        <View style={styles.editRow}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={handleCancelEdit}
                                disabled={saving}
                            >
                                <Text style={styles.cancelBtnText}>{'Cancel'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={styles.saveBtnText}>{'Save Changes'}</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ── Menu sections ────────────────────────────────────────── */}
                <View style={styles.menuContainer}>
                    {MENU_SECTIONS.map((section) => (
                        <View key={section.title} style={styles.menuSection}>
                            <Text style={styles.menuSectionTitle}>{section.title}</Text>
                            <View style={styles.menuCard}>
                                {section.items.map((item, i) => (
                                    <React.Fragment key={item.label}>
                                        <TouchableOpacity
                                            style={styles.menuRow}
                                            onPress={() => item.route && router.push(item.route as any)}
                                            activeOpacity={item.route ? 0.7 : 1}
                                        >
                                            <View style={[styles.menuIconBox, { backgroundColor: item.color + '18' }]}>
                                                <Ionicons name={item.icon} size={19} color={item.color} />
                                            </View>
                                            <View style={styles.menuTextWrap}>
                                                <Text style={styles.menuLabel}>{item.label}</Text>
                                                <Text style={styles.menuSub}>{item.sub}</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                                        </TouchableOpacity>
                                        {i < section.items.length - 1 && (
                                            <View style={styles.menuDivider} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>

                {/* ── Logout button ────────────────────────────────────────── */}
                <View style={styles.logoutSection}>
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={handleLogout}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                        <Text style={styles.logoutText}>{'Log Out'}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.versionText}>{'MotoBee v1.0.0'}</Text>
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

const styles = StyleSheet.create({
    scrollContent: { paddingBottom: 40 },

    header: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    title: { ...Typography.h1, color: Colors.textPrimary },

    profileSection: { paddingTop: Spacing.lg, paddingBottom: Spacing.lg, marginBottom: Spacing.md, borderBottomWidth: 2, borderBottomColor: Colors.borderLight, gap: Spacing.sm },
    profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm, marginHorizontal: Spacing.md },
    avatarBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
    profileInfo: { flex: 1 },
    profileName: { ...Typography.h3, color: Colors.textPrimary },
    profileEmail: { ...Typography.body, color: Colors.textSecondary, marginTop: 3 },
    roleBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
    roleBadgeText: { ...Typography.overline, color: Colors.primary, fontWeight: '600' },
    editIconBtn: { padding: Spacing.sm },
    inlineInput: { ...Typography.body, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 7, backgroundColor: Colors.primaryLight },

    editRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.xs },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, borderRadius: Radius.lg, alignItems: 'center', backgroundColor: Colors.surface },
    cancelBtnText: { ...Typography.button, color: Colors.textSecondary },
    saveBtn: { flex: 2, backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' },
    saveBtnText: { ...Typography.button, color: '#fff' },

    menuContainer: { paddingHorizontal: Spacing.md, gap: Spacing.lg },
    menuSection: { gap: Spacing.xs },
    menuSectionTitle: { ...Typography.overline, color: Colors.textTertiary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: Spacing.xs, marginBottom: 4 },
    menuCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
    menuIconBox: { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    menuTextWrap: { flex: 1 },
    menuLabel: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600' },
    menuSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
    menuDivider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 70 },

    logoutSection: { marginTop: Spacing.lg, marginHorizontal: Spacing.md },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.errorLight, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: '#FECACA' },
    logoutText: { ...Typography.button, color: Colors.error },

    versionText: { ...Typography.caption, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.lg, marginBottom: Spacing.sm },
});