// app/(customer)/terms-of-service.tsx

import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

const SECTIONS = [
    {
        id: '01',
        title: 'Acceptance of Terms',
        body: `By accessing or using the MotoBee platform ("App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the App.\n\nThese terms apply to all users including customers, garage owners, and visitors.`,
    },
    {
        id: '02',
        title: 'Description of Service',
        body: `MotoBee provides an online marketplace connecting customers with local garage service providers for two-wheeler repair, maintenance and servicing.\n\nMotoBee is not itself a service provider. We facilitate bookings between customers and independent garages. The quality of service rendered is the sole responsibility of the garage owner.`,
    },
    {
        id: '03',
        title: 'User Accounts',
        body: `You must register an account to use the App. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.\n\nYou agree to provide accurate, current and complete information during registration and to update such information to keep it accurate.`,
    },
    {
        id: '04',
        title: 'Bookings & Cancellations',
        body: `All bookings made through MotoBee are subject to availability and confirmation by the garage owner.\n\nCancellations made more than 2 hours before the scheduled appointment are eligible for a full refund. Cancellations made within 2 hours may be subject to a cancellation fee at the garage's discretion.\n\nMotoBee reserves the right to cancel bookings in cases of fraud, misuse or unavailability.`,
    },
    {
        id: '05',
        title: 'Payments & Billing',
        body: `All prices displayed are inclusive of applicable taxes (GST and Infrastructure Cess). Service fees are charged to cover platform maintenance and processing.\n\nPickup and delivery charges are additional and are clearly disclosed before payment confirmation.\n\nPayments are processed through a secure payment gateway. MotoBee does not store your card details.`,
    },
    {
        id: '06',
        title: 'Prohibited Conduct',
        body: `You agree not to:\n\n• Use the App for any unlawful purpose\n• Post false, misleading or fraudulent information\n• Impersonate any person or entity\n• Attempt to gain unauthorised access to any part of the App\n• Interfere with the proper working of the App\n• Use automated tools to scrape or extract data`,
    },
    {
        id: '07',
        title: 'Limitation of Liability',
        body: `To the maximum extent permitted by law, MotoBee and its affiliates shall not be liable for any indirect, incidental, special, consequential or punitive damages, including but not limited to loss of profits, data or goodwill.\n\nMotoBee's total liability for any claim arising out of or related to these Terms shall not exceed the amount you paid MotoBee in the 3 months preceding the event giving rise to the claim.`,
    },
    {
        id: '08',
        title: 'Modifications to Terms',
        body: `MotoBee reserves the right to update these Terms at any time. We will notify you of material changes via the App or email. Continued use of the App after changes constitutes acceptance of the new terms.\n\nIt is your responsibility to review these Terms periodically.`,
    },
    {
        id: '09',
        title: 'Governing Law',
        body: `These Terms are governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts in Nagpur, Maharashtra.`,
    },
    {
        id: '10',
        title: 'Contact Us',
        body: `For any questions regarding these Terms of Service, please contact us at:\n\nsupport@motobee.in\n\nMotoBee Technologies Pvt. Ltd.\nNagpur, Maharashtra, India — 440001`,
    },
];

export default function TermsOfServiceScreen() {
    const router = useRouter();
    const [expanded, setExpanded] = useState<string | null>('01');

    const toggle = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded((prev) => (prev === id ? null : id));
    };

    return (
        <View style={styles.root}>

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(customer)/about")}>
                    <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Terms of Service</Text>
                    <Text style={styles.headerSub}>Last updated: March 2026</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Intro banner */}
                <View style={styles.introBanner}>
                    <Ionicons name="document-text-outline" size={28} color={Colors.primary} />
                    <Text style={styles.introText}>
                        Please read these Terms carefully before using MotoBee. By using our service, you agree to these terms.
                    </Text>
                </View>

                {/* Accordion sections */}
                {SECTIONS.map((sec) => {
                    const isOpen = expanded === sec.id;
                    return (
                        <View key={sec.id} style={styles.accordionCard}>
                            <TouchableOpacity
                                style={styles.accordionHeader}
                                onPress={() => toggle(sec.id)}
                                activeOpacity={0.75}
                            >
                                <View style={styles.accordionBadge}>
                                    <Text style={styles.accordionBadgeText}>{sec.id}</Text>
                                </View>
                                <Text style={styles.accordionTitle}>{sec.title}</Text>
                                <Ionicons
                                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={Colors.textTertiary}
                                />
                            </TouchableOpacity>
                            {isOpen && (
                                <View style={styles.accordionBody}>
                                    <View style={styles.accordionDivider} />
                                    <Text style={styles.accordionBodyText}>{sec.body}</Text>
                                </View>
                            )}
                        </View>
                    );
                })}

                <Text style={styles.footer}>
                    © 2026 MotoBee Technologies Pvt. Ltd. All rights reserved.
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
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },
    headerSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },

    content: { padding: Spacing.md, gap: Spacing.sm },

    introBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
        backgroundColor: Colors.primaryLight,
        borderRadius: Radius.lg, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.primary + '40',
    },
    introText: {
        ...Typography.body, color: Colors.textPrimary,
        flex: 1, lineHeight: 22,
    },

    accordionCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1, borderColor: Colors.border,
        overflow: 'hidden', ...Shadow.sm,
    },
    accordionHeader: {
        flexDirection: 'row', alignItems: 'center',
        gap: Spacing.sm, padding: Spacing.md,
    },
    accordionBadge: {
        width: 28, height: 28, borderRadius: Radius.sm,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center', justifyContent: 'center',
    },
    accordionBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
    accordionTitle: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700', flex: 1 },
    accordionDivider: { height: 1, backgroundColor: Colors.borderLight, marginBottom: Spacing.sm },
    accordionBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
    accordionBodyText: { ...Typography.body, color: Colors.textSecondary, lineHeight: 24 },

    footer: {
        ...Typography.caption, color: Colors.textTertiary,
        textAlign: 'center', marginTop: Spacing.lg,
    },
});