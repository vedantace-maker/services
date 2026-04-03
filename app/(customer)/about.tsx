// app/(customer)/about.tsx

import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

const LINKS = [
    {
        icon: 'document-text-outline' as const,
        label: 'Terms of Service',
        sub: 'Usage rules, bookings, payments and liability',
        route: '/(customer)/terms-of-service',
        color: Colors.primary,
        bg: Colors.primaryLight,
    },
    {
        icon: 'shield-checkmark-outline' as const,
        label: 'Privacy Policy',
        sub: 'How we collect, use and protect your data',
        route: '/(customer)/privacy-policy',
        color: '#7C3AED',
        bg: '#EDE9FE',
    },
];

export default function AboutScreen() {
    const router = useRouter();

    return (
        <View style={styles.root}>

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About MotoBee</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* ── App identity card ────────────────────────────────────────── */}
                <View style={styles.identityCard}>
                    <View style={styles.logoBox}>
                        <Ionicons name="bicycle" size={40} color={Colors.primary} />
                    </View>
                    <Text style={styles.appName}>MotoBee</Text>
                    <Text style={styles.appTagline}>Your trusted two-wheeler service partner</Text>
                    <View style={styles.versionPill}>
                        <Text style={styles.versionText}>Version 1.0.0</Text>
                    </View>
                </View>

                {/* ── Legal links ──────────────────────────────────────────────── */}
                <Text style={styles.sectionLabel}>LEGAL</Text>
                <View style={styles.menuCard}>
                    {LINKS.map((item, i) => (
                        <React.Fragment key={item.label}>
                            <TouchableOpacity
                                style={styles.menuRow}
                                onPress={() => router.push(item.route as any)}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.menuIconBox, { backgroundColor: item.bg }]}>
                                    <Ionicons name={item.icon} size={19} color={item.color} />
                                </View>
                                <View style={styles.menuTextWrap}>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    <Text style={styles.menuSub}>{item.sub}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                            </TouchableOpacity>
                            {i < LINKS.length - 1 && <View style={styles.menuDivider} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* ── Build info ───────────────────────────────────────────────── */}
                <View style={styles.buildInfo}>
                    {[
                        { label: 'Build', value: '2026.03.31' },
                        { label: 'Platform', value: 'React Native (Expo)' },
                        { label: 'Backend', value: 'Django REST Framework' },
                        { label: 'Support', value: 'support@motobee.in' },
                    ].map((row) => (
                        <View key={row.label} style={styles.buildRow}>
                            <Text style={styles.buildLabel}>{row.label}</Text>
                            <Text style={styles.buildValue}>{row.value}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.copyright}>
                    © 2026 MotoBee Technologies Pvt. Ltd.{'\n'}All rights reserved.
                </Text>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 56, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    backBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },

    content: { padding: Spacing.md, gap: Spacing.md },

    // Identity card
    identityCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
        padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
        ...Shadow.sm,
    },
    logoBox: {
        width: 72, height: 72, borderRadius: 20,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center', justifyContent: 'center',
    },
    appName: { ...Typography.h1, color: Colors.textPrimary },
    appTagline: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },
    versionPill: {
        backgroundColor: Colors.surfaceAlt,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.md, paddingVertical: 4,
        borderWidth: 1, borderColor: Colors.border,
        marginTop: 4,
    },
    versionText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },

    // Section label
    sectionLabel: {
        ...Typography.caption, color: Colors.textTertiary,
        fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8,
    },

    // Menu card (reuses account.tsx style)
    menuCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
    menuIconBox: { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    menuTextWrap: { flex: 1 },
    menuLabel: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600' },
    menuSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
    menuDivider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 70 },

    // Build info
    buildInfo: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
        padding: Spacing.md, gap: Spacing.sm, ...Shadow.sm,
    },
    buildRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    buildLabel: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '600' },
    buildValue: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '500' },

    copyright: {
        ...Typography.caption, color: Colors.textTertiary,
        textAlign: 'center', lineHeight: 20,
    },
});