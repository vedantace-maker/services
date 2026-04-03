// app/(customer)/privacy-policy.tsx

import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

const SECTIONS = [
    {
        id: '01',
        icon: 'person-outline',
        title: 'Information We Collect',
        body: `We collect the following types of information when you use MotoBee:\n\n• Personal Information: Name, email address, phone number and profile photo provided during registration.\n\n• Vehicle Information: Details of vehicles you add to your profile including make, model, registration number and type.\n\n• Location Data: With your permission, we collect your device's location to auto-fill pickup addresses and show nearby garages.\n\n• Device Information: Device type, operating system, app version and push notification token for service delivery.\n\n• Usage Data: Booking history, service preferences and interaction patterns to improve the App.`,
    },
    {
        id: '02',
        icon: 'settings-outline',
        title: 'How We Use Your Information',
        body: `We use your information to:\n\n• Create and manage your account\n• Process and confirm bookings\n• Send push notifications about booking status updates\n• Facilitate communication between you and garage owners\n• Detect and prevent fraud and abuse\n• Improve our App and personalise your experience\n• Comply with legal obligations\n\nWe do not use your data for any purpose beyond what is described in this policy without your consent.`,
    },
    {
        id: '03',
        icon: 'share-social-outline',
        title: 'Sharing of Information',
        body: `We share your information only in the following circumstances:\n\n• With Garage Owners: Your name, vehicle details and booking information are shared with the garage you book with to facilitate the service.\n\n• Service Providers: We use trusted third-party providers (e.g. Firebase, payment gateways) who process data only on our behalf under strict confidentiality agreements.\n\n• Legal Requirements: We may disclose information if required by law, court order or governmental authority.\n\nWe do not sell your personal data to any third party.`,
    },
    {
        id: '04',
        icon: 'location-outline',
        title: 'Location Data',
        body: `Location access is requested only when you choose to auto-detect your pickup address on the cart page. We do not track your location in the background.\n\nLocation data is used solely to reverse-geocode your current position into a human-readable address. It is not stored on our servers beyond the booking request.\n\nYou can deny location permission and manually enter your address at any time.`,
    },
    {
        id: '05',
        icon: 'notifications-outline',
        title: 'Push Notifications',
        body: `We use your device's FCM (Firebase Cloud Messaging) token to send you booking status notifications such as booking confirmed, rejected, repair started and service completed.\n\nYour FCM token is stored securely on our servers and is never shared with third parties.\n\nYou can disable notifications at any time through your device settings.`,
    },
    {
        id: '06',
        icon: 'shield-checkmark-outline',
        title: 'Data Security',
        body: `We take the security of your data seriously and implement industry-standard measures including:\n\n• HTTPS encryption for all data in transit\n• Encrypted database storage\n• Token-based authentication (JWT)\n• Regular security audits\n\nHowever, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security and encourage you to use strong passwords and keep your login details confidential.`,
    },
    {
        id: '07',
        icon: 'time-outline',
        title: 'Data Retention',
        body: `We retain your personal data for as long as your account is active or as needed to provide services.\n\nBooking history is retained for 3 years for legal and dispute resolution purposes.\n\nYou may request deletion of your account and associated data at any time by contacting support@motobee.in. Account deletion will be processed within 30 days.`,
    },
    {
        id: '08',
        icon: 'happy-outline',
        title: 'Your Rights',
        body: `Under applicable data protection laws, you have the right to:\n\n• Access the personal data we hold about you\n• Correct inaccurate or incomplete data\n• Request deletion of your data ("Right to be forgotten")\n• Withdraw consent for data processing at any time\n• Lodge a complaint with a supervisory authority\n\nTo exercise any of these rights, contact us at support@motobee.in.`,
    },
    {
        id: '09',
        icon: 'people-outline',
        title: 'Children\'s Privacy',
        body: `MotoBee is not intended for users under the age of 18. We do not knowingly collect personal data from minors.\n\nIf we become aware that a child under 18 has provided us with personal information, we will take steps to delete such information promptly.`,
    },
    {
        id: '10',
        icon: 'refresh-outline',
        title: 'Changes to This Policy',
        body: `We may update this Privacy Policy periodically to reflect changes in our practices or for legal, operational or regulatory reasons.\n\nWe will notify you of significant changes through the App or via email. The date of the latest revision is displayed at the top of this page.\n\nContinued use of the App after changes constitutes your acceptance of the updated policy.`,
    },
    {
        id: '11',
        icon: 'mail-outline',
        title: 'Contact Us',
        body: `For any privacy-related queries, requests or complaints, contact our Data Protection Officer at:\n\nprivacy@motobee.in\n\nMotoBee Technologies Pvt. Ltd.\nNagpur, Maharashtra, India — 440001\n\nWe aim to respond to all requests within 7 business days.`,
    },
];

export default function PrivacyPolicyScreen() {
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
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Privacy Policy</Text>
                    <Text style={styles.headerSub}>Last updated: March 2026</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Intro banner */}
                <View style={styles.introBanner}>
                    <Ionicons name="shield-checkmark-outline" size={28} color={'#7C3AED'} />
                    <Text style={styles.introText}>
                        Your privacy matters to us. This policy explains what data we collect, how we use it, and your rights as a user of MotoBee.
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
                                    <Ionicons name={sec.icon as any} size={14} color={'#7C3AED'} />
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
        backgroundColor: '#EDE9FE',
        borderRadius: Radius.lg, padding: Spacing.md,
        borderWidth: 1, borderColor: '#C4B5FD',
    },
    introText: { ...Typography.body, color: Colors.textPrimary, flex: 1, lineHeight: 22 },

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
        backgroundColor: '#EDE9FE',
        alignItems: 'center', justifyContent: 'center',
    },
    accordionTitle: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700', flex: 1 },
    accordionDivider: { height: 1, backgroundColor: Colors.borderLight, marginBottom: Spacing.sm },
    accordionBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
    accordionBodyText: { ...Typography.body, color: Colors.textSecondary, lineHeight: 24 },

    footer: {
        ...Typography.caption, color: Colors.textTertiary,
        textAlign: 'center', marginTop: Spacing.lg,
    },
});