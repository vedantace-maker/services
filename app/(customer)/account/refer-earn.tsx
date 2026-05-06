import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Share, Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../../store/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

export default function ReferEarnScreen() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const [copied, setCopied] = useState(false);

    // Generate referral code from user name + id
    const referralCode = `${user?.name?.split(' ')[0].toUpperCase() ?? 'USER'}${String(user?.uid ?? '').slice(-4)}`;

    const handleCopy = () => {
        Clipboard.setString(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `🔧 Book your bike & scooty service with GarageApp!\n\nUse my referral code: ${referralCode}\n\nDownload now and get ₹50 off your first booking! 🎉`,
                title: 'Invite friends to GarageApp',
            });
        } catch { }
    };

    const HOW_IT_WORKS = [
        { icon: 'share-social-outline', step: '1', title: 'Share Your Code', desc: 'Share your unique referral code with friends.' },
        { icon: 'person-add-outline', step: '2', title: 'Friend Signs Up', desc: 'Your friend registers using your referral code.' },
        { icon: 'checkmark-circle-outline', step: '3', title: 'Friend Books', desc: 'Your friend completes their first booking.' },
        { icon: 'gift-outline', step: '4', title: 'Both Earn ₹50', desc: 'You and your friend both receive ₹50 wallet credit.' },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(customer)/account")}>
                    <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Refer & Earn</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Hero */}
                <View style={styles.hero}>
                    <View style={styles.heroIconWrap}>
                        <Ionicons name="gift-outline" size={44} color={Colors.warning} />
                    </View>
                    <Text style={styles.heroTitle}>Invite Friends,{'\n'}Earn Rewards</Text>
                    <Text style={styles.heroDesc}>
                        For every friend who signs up and completes a booking,
                        you both get <Text style={styles.heroHighlight}>₹50 wallet credit</Text>.
                    </Text>
                </View>

                {/* Referral code card */}
                <View style={styles.codeCard}>
                    <Text style={styles.codeLabel}>Your Referral Code</Text>
                    <View style={styles.codeRow}>
                        <Text style={styles.codeText}>{referralCode}</Text>
                        <TouchableOpacity
                            style={[styles.copyBtn, copied && styles.copyBtnDone]}
                            onPress={handleCopy}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={copied ? 'checkmark-outline' : 'copy-outline'}
                                size={16}
                                color={copied ? Colors.success : Colors.primary}
                            />
                            <Text style={[styles.copyBtnText, copied && styles.copyBtnTextDone]}>
                                {copied ? 'Copied!' : 'Copy'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                        <Ionicons name="share-social-outline" size={20} color="#fff" />
                        <Text style={styles.shareBtnText}>Share with Friends</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    {[
                        { icon: 'people-outline', label: 'Friends Referred', value: '0', color: Colors.primary },
                        { icon: 'wallet-outline', label: 'Total Earned', value: '₹0', color: Colors.success },
                        { icon: 'hourglass-outline', label: 'Pending', value: '0', color: Colors.warning },
                    ].map((s) => (
                        <View key={s.label} style={styles.statBox}>
                            <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}>
                                <Ionicons name={s.icon as any} size={18} color={s.color} />
                            </View>
                            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* How it works */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>How It Works</Text>
                    {HOW_IT_WORKS.map((step, i) => (
                        <View key={step.step} style={styles.stepRow}>
                            <View style={styles.stepLeft}>
                                <View style={styles.stepBadge}>
                                    <Text style={styles.stepBadgeText}>{step.step}</Text>
                                </View>
                                {i < HOW_IT_WORKS.length - 1 && <View style={styles.stepLine} />}
                            </View>
                            <View style={styles.stepContent}>
                                <View style={styles.stepIconBox}>
                                    <Ionicons name={step.icon as any} size={18} color={Colors.primary} />
                                </View>
                                <View style={styles.stepText}>
                                    <Text style={styles.stepTitle}>{step.title}</Text>
                                    <Text style={styles.stepDesc}>{step.desc}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Terms */}
                <View style={styles.termsCard}>
                    <Text style={styles.termsTitle}>Terms & Conditions</Text>
                    {[
                        'Referral credit is valid for 90 days from issue date.',
                        'Credit applies only on the first booking made by your referred friend.',
                        'Maximum 20 referrals per user per month.',
                        'GarageApp reserves the right to modify or cancel this offer.',
                    ].map((t, i) => (
                        <View key={i} style={styles.termsRow}>
                            <View style={styles.termsDot} />
                            <Text style={styles.termsText}>{t}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 56, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    backBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },

    content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },

    // Hero
    hero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
    heroIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
    heroTitle: { ...Typography.h1, color: Colors.textPrimary, textAlign: 'center', lineHeight: 36 },
    heroDesc: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center', lineHeight: 22 },
    heroHighlight: { color: Colors.warning, fontWeight: '700' },

    // Code card
    codeCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        borderWidth: 1, borderColor: Colors.border,
        padding: Spacing.md, gap: Spacing.md, ...Shadow.sm,
    },
    codeLabel: { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6 },
    codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary + '40', borderStyle: 'dashed' },
    codeText: { ...Typography.h1, color: Colors.primary, letterSpacing: 3 },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 7, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
    copyBtnDone: { borderColor: Colors.success, backgroundColor: Colors.successLight },
    copyBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
    copyBtnTextDone: { color: Colors.success },

    shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md },
    shareBtnText: { ...Typography.button, color: '#fff' },

    // Stats
    statsRow: { flexDirection: 'row', gap: Spacing.sm },
    statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm, alignItems: 'center', gap: 5, ...Shadow.sm },
    statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    statValue: { ...Typography.h2, fontWeight: '800' },
    statLabel: { fontSize: 9, color: Colors.textTertiary, fontWeight: '600', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },

    // How it works
    section: { gap: Spacing.sm },
    sectionTitle: { ...Typography.h3, color: Colors.textPrimary },
    stepRow: { flexDirection: 'row', gap: Spacing.md },
    stepLeft: { alignItems: 'center', width: 32 },
    stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    stepBadgeText: { fontSize: 12, color: '#fff', fontWeight: '800' },
    stepLine: { flex: 1, width: 2, backgroundColor: Colors.primaryLight, marginTop: 4 },
    stepContent: { flex: 1, flexDirection: 'row', gap: Spacing.sm, paddingBottom: Spacing.md },
    stepIconBox: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    stepText: { flex: 1, gap: 3 },
    stepTitle: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700' },
    stepDesc: { ...Typography.caption, color: Colors.textTertiary, lineHeight: 18 },

    // Terms
    termsCard: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm },
    termsTitle: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    termsRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    termsDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.textTertiary, marginTop: 7 },
    termsText: { ...Typography.caption, color: Colors.textTertiary, flex: 1, lineHeight: 18 },
});
