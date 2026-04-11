// app/(customer)/account.tsx

import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as Location from 'expo-location';                          // ✅ add
import { useAuthStore } from '../../store/authStore';
import { logoutUser } from '../../utils/services/authService';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function CustomerAccount() {
    const { user, logout, updateUser } = useAuthStore();
    const { toast, showToast, hideToast } = useToast();

    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [address, setAddress] = useState(user?.address ?? '');
    const [saving, setSaving] = useState(false);
    const [detectingLoc, setDetectingLoc] = useState(false);       // ✅ add

    // ── Logout ────────────────────────────────────────────────────────────────
    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive',
                onPress: async () => {
                    try { await logoutUser(); } catch { }
                    finally { await logout(); }
                },
            },
        ]);
    };

    // ── Edit profile ──────────────────────────────────────────────────────────
    const handleOpenEdit = () => {
        setName(user?.name ?? '');
        setPhone(user?.phone ?? '');
        setAddress(user?.address ?? '');
        setEditMode(true);
    };

    const handleCancelEdit = () => {
        setName(user?.name ?? '');
        setPhone(user?.phone ?? '');
        setAddress(user?.address ?? '');
        setEditMode(false);
    };

    const handleSave = async () => {
        if (!name.trim()) { showToast('Name cannot be empty.', 'error'); return; }
        setSaving(true);
        try {
            await updateUser({ name: name.trim(), phone: phone.trim(), address: address.trim() });
            setEditMode(false);
            showToast('Profile updated successfully.', 'success');
        } catch (e: any) {
            showToast(e?.message ?? 'Failed to update profile.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Auto-detect location ──────────────────────────────────────────────────
    const handleDetectLocation = async () => {
        setDetectingLoc(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showToast('Location permission denied.', 'error');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const results = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
            if (results.length > 0) {
                const r = results[0];
                const parts = [
                    r.name, r.street, r.district,
                    r.city, r.region, r.postalCode,
                ].filter(Boolean);
                setAddress(parts.join(', '));
            } else {
                showToast('Could not determine address.', 'warning');
            }
        } catch {
            showToast('Failed to detect location.', 'error');
        } finally {
            setDetectingLoc(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
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
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ── Header ───────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <Text style={styles.title}>{'Account'}</Text>
                </View>

                {/* ══════════════════════════════════════════════════════════
                    PROFILE SECTION
                ══════════════════════════════════════════════════════════ */}
                <View style={styles.profileSection}>

                    {/* Avatar + name + edit button row */}
                    <View style={styles.profileTopRow}>
                        <View style={styles.avatarBox}>
                            <Text style={styles.avatarText}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.profileMeta}>
                            <Text style={styles.profileName}>{user?.name}</Text>
                            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>
                            <View style={styles.roleBadge}>
                                <Ionicons name="shield-checkmark-outline" size={10} color={Colors.primary} />
                                <Text style={styles.roleBadgeText}>{'Customer'}</Text>
                            </View>
                        </View>
                        {/* ✅ Edit button — always visible in view mode */}
                        {!editMode && (
                            <TouchableOpacity style={styles.editBtn} onPress={handleOpenEdit} activeOpacity={0.8}>
                                <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
                                <Text style={styles.editBtnText}>{'Edit'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* ── VIEW mode — info chips ───────────────────────────── */}
                    {!editMode && (
                        <View style={styles.infoGrid}>
                            {/* Phone */}
                            <TouchableOpacity
                                style={styles.infoChip}
                                onPress={!user?.phone ? handleOpenEdit : undefined}
                                activeOpacity={!user?.phone ? 0.7 : 1}
                            >
                                <View style={[styles.chipIcon, { backgroundColor: '#E0F2FE' }]}>
                                    <Ionicons name="call-outline" size={15} color="#0891B2" />
                                </View>
                                <View style={styles.chipBody}>
                                    <Text style={styles.chipLabel}>{'Phone'}</Text>
                                    <Text style={user?.phone ? styles.chipValue : styles.chipEmpty}>
                                        {user?.phone ?? 'Add phone number'}
                                    </Text>
                                </View>
                                {!user?.phone && (
                                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                                )}
                            </TouchableOpacity>

                            {/* Address */}
                            <TouchableOpacity
                                style={styles.infoChip}
                                onPress={!user?.address ? handleOpenEdit : undefined}
                                activeOpacity={!user?.address ? 0.7 : 1}
                            >
                                <View style={[styles.chipIcon, { backgroundColor: '#FEF3C7' }]}>
                                    <Ionicons name="location-outline" size={15} color="#D97706" />
                                </View>
                                <View style={styles.chipBody}>
                                    <Text style={styles.chipLabel}>{'Address'}</Text>
                                    <Text style={user?.address ? styles.chipValue : styles.chipEmpty}>
                                        {user?.address ?? 'Add address'}
                                    </Text>
                                </View>
                                {!user?.address && (
                                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── EDIT mode — fields ───────────────────────────────── */}
                    {editMode && (
                        <View style={styles.editCard}>

                            {/* Name */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>{'FULL NAME'}</Text>
                                <View style={styles.inputRow}>
                                    <Ionicons name="person-outline" size={16} color={Colors.textTertiary} />
                                    <TextInput
                                        style={styles.inputField}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Your full name"
                                        placeholderTextColor={Colors.textTertiary}
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>

                            {/* Phone */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>{'PHONE NUMBER'}</Text>
                                <View style={styles.inputRow}>
                                    <Ionicons name="call-outline" size={16} color={Colors.textTertiary} />
                                    <TextInput
                                        style={styles.inputField}
                                        value={phone}
                                        onChangeText={setPhone}
                                        placeholder="+91 00000 00000"
                                        keyboardType="phone-pad"
                                        placeholderTextColor={Colors.textTertiary}
                                    />
                                </View>
                            </View>

                            {/* Address + detect button */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>{'ADDRESS'}</Text>
                                <View style={[styles.inputRow, styles.inputRowMultiline]}>
                                    <Ionicons name="location-outline" size={16} color={Colors.textTertiary} style={{ marginTop: 2 }} />
                                    <TextInput
                                        style={[styles.inputField, styles.inputFieldMultiline]}
                                        value={address}
                                        onChangeText={setAddress}
                                        placeholder="Home or delivery address"
                                        placeholderTextColor={Colors.textTertiary}
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                    />
                                </View>

                                {/* ✅ Detect location button */}
                                <TouchableOpacity
                                    style={[styles.detectBtn, detectingLoc && { opacity: 0.7 }]}
                                    onPress={handleDetectLocation}
                                    disabled={detectingLoc}
                                    activeOpacity={0.8}
                                >
                                    {detectingLoc ? (
                                        <>
                                            <ActivityIndicator size="small" color={Colors.primary} />
                                            <Text style={styles.detectBtnText}>{'Detecting location…'}</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="navigate-outline" size={15} color={Colors.primary} />
                                            <Text style={styles.detectBtnText}>{'Use my current location'}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Save / Cancel */}
                            <View style={styles.editActionRow}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit} disabled={saving}>
                                    <Text style={styles.cancelBtnText}>{'Cancel'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                                    onPress={handleSave}
                                    disabled={saving}
                                >
                                    {saving
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <>
                                            <Ionicons name="checkmark-outline" size={16} color="#fff" />
                                            <Text style={styles.saveBtnText}>{'Save Changes'}</Text>
                                        </>
                                    }
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* ── Menu sections — UNCHANGED ────────────────────────────── */}
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
                                        {i < section.items.length - 1 && <View style={styles.menuDivider} />}
                                    </React.Fragment>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>

                {/* ── Logout ───────────────────────────────────────────────── */}
                <View style={styles.logoutSection}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                        <Text style={styles.logoutText}>{'Log Out'}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.versionText}>{'MotoBee v1.0.0'}</Text>
            </ScrollView>

            <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
        </View>
    );
}

const styles = StyleSheet.create({
    scrollContent: { paddingBottom: 48 },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.md,
        paddingTop: 56,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    title: { ...Typography.h1, color: Colors.textPrimary },

    // ── Profile section wrapper ───────────────────────────────────────────────
    profileSection: {
        margin: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        ...Shadow.sm,
    },

    // ── Avatar + name row ─────────────────────────────────────────────────────
    profileTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    avatarBox: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    avatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
    profileMeta: { flex: 1, gap: 3 },
    profileName: { ...Typography.h3, color: Colors.textPrimary },
    profileEmail: { ...Typography.caption, color: Colors.textSecondary },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        backgroundColor: Colors.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: Radius.full,
        marginTop: 2,
    },
    roleBadgeText: { ...Typography.overline, color: Colors.primary, fontWeight: '700' },

    // ✅ Edit button — clear, top-right of the row
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 7,
        borderRadius: Radius.md,
        backgroundColor: Colors.primaryLight,
        borderWidth: 1,
        borderColor: Colors.primary,
        alignSelf: 'flex-start',
    },
    editBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

    // ── View mode chips ───────────────────────────────────────────────────────
    infoGrid: { padding: Spacing.md, gap: Spacing.sm },
    infoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.bg,
        borderRadius: Radius.md,
        padding: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    chipIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    chipBody: { flex: 1 },
    chipLabel: { ...Typography.overline, color: Colors.textTertiary, fontWeight: '700', fontSize: 10 },
    chipValue: { ...Typography.body, color: Colors.textPrimary, fontWeight: '500', marginTop: 1 },
    chipEmpty: { ...Typography.caption, color: Colors.primary, marginTop: 1 },

    // ── Edit mode card ────────────────────────────────────────────────────────
    editCard: {
        padding: Spacing.md,
        gap: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        backgroundColor: Colors.bg,
    },
    fieldGroup: { gap: 6 },
    fieldLabel: {
        ...Typography.overline,
        color: Colors.textTertiary,
        fontWeight: '800',
        letterSpacing: 0.8,
        paddingLeft: 2,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    inputRowMultiline: { alignItems: 'flex-start', paddingVertical: Spacing.sm },
    inputField: { ...Typography.body, flex: 1, color: Colors.textPrimary },
    inputFieldMultiline: { minHeight: 64 },

    // ✅ Detect location button
    detectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: Colors.primaryLight,
        borderRadius: Radius.md,
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.primary,
        marginTop: 6,
    },
    detectBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

    // Save / Cancel
    editActionRow: { flexDirection: 'row', gap: Spacing.sm },
    cancelBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        borderRadius: Radius.lg,
        alignItems: 'center',
        backgroundColor: Colors.surface,
    },
    cancelBtnText: { ...Typography.button, color: Colors.textSecondary },
    saveBtn: {
        flex: 2,
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        padding: Spacing.md,
        borderRadius: Radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    saveBtnText: { ...Typography.button, color: '#fff' },

    // ── Menu (unchanged) ──────────────────────────────────────────────────────
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

    // ── Logout (unchanged) ────────────────────────────────────────────────────
    logoutSection: { marginTop: Spacing.lg, marginHorizontal: Spacing.md },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.errorLight, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: '#FECACA' },
    logoutText: { ...Typography.button, color: Colors.error },

    versionText: { ...Typography.caption, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.lg, marginBottom: Spacing.sm },
});