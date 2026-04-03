// app/(customer)/garage-details.tsx

import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getGarageById } from '../../utils/services/garageService';
import { Garage } from '../../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

type VehicleTab = 'bike' | 'scooty';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPrice(price: number | undefined): string {
    if (price == null || price === 0) return 'On request';
    return '₹' + price.toLocaleString('en-IN');
}

// ── Price Row ─────────────────────────────────────────────────────────────────
function PriceRow({
    name, price, isComplete, isLast,
}: {
    name: string; price: number | undefined;
    isComplete?: boolean; isLast?: boolean;
}) {
    return (
        <View style={[priceRowStyles.wrap, !isLast && priceRowStyles.bordered, isComplete && priceRowStyles.completeWrap]}>
            <View style={priceRowStyles.left}>
                {isComplete ? (
                    <View style={priceRowStyles.starBadge}>
                        <Ionicons name="star" size={11} color="#92400E" />
                    </View>
                ) : (
                    <View style={priceRowStyles.dot} />
                )}
                <Text style={[priceRowStyles.name, isComplete && priceRowStyles.completeName]}>
                    {name}
                </Text>
                {isComplete && (
                    <View style={priceRowStyles.allInclusiveBadge}>
                        <Text style={priceRowStyles.allInclusiveText}>{'All Inclusive'}</Text>
                    </View>
                )}
            </View>
            <Text style={[priceRowStyles.price, isComplete && priceRowStyles.completePrice, price == null || price === 0 ? priceRowStyles.priceOnRequest : null]}>
                {formatPrice(price)}
            </Text>
        </View>
    );
}

const priceRowStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, gap: Spacing.sm },
    bordered: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    completeWrap: { backgroundColor: '#FFFBEB', marginHorizontal: -Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md },
    left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary + '80' },
    starBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' },
    name: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
    completeName: { fontWeight: '700', color: '#92400E' },
    allInclusiveBadge: { backgroundColor: '#FDE68A', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
    allInclusiveText: { fontSize: 9, fontWeight: '800', color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.5 },
    price: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700', textAlign: 'right' },
    completePrice: { color: '#92400E', fontSize: 16 },
    priceOnRequest: { color: Colors.textTertiary, fontWeight: '400', fontStyle: 'italic', fontSize: 13 },
});

// ── Info Row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <View style={infoRowStyles.wrap}>
            <View style={infoRowStyles.iconBox}>
                <Ionicons name={icon} size={16} color={Colors.primary} />
            </View>
            <View style={infoRowStyles.textWrap}>
                <Text style={infoRowStyles.label}>{label}</Text>
                <Text style={infoRowStyles.value}>{value}</Text>
            </View>
        </View>
    );
}

const infoRowStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
    iconBox: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    textWrap: { flex: 1 },
    label: { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    value: { ...Typography.body, color: Colors.textPrimary, fontWeight: '500', marginTop: 1 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function GarageDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { toast, showToast, hideToast } = useToast();

    const [garage, setGarage] = useState<Garage | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<VehicleTab>('bike');

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getGarageById(id)
            .then(setGarage)
            .catch((e: any) => showToast(e?.response?.data?.detail ?? 'Failed to load garage.', 'error'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} size="large" />
        </View>
    );

    if (!garage) return (
        <View style={styles.errorWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <Text style={styles.errorText}>{'Garage not found.'}</Text>
        </View>
    );

    // ── Data ──────────────────────────────────────────────────────────────────
    const services = garage.services?.[tab] ?? [];
    const prices = garage.service_prices?.[tab] ?? {};
    const completePrice = prices['Complete Servicing'];
    const totalServices = (garage.services?.bike?.length ?? 0) + (garage.services?.scooty?.length ?? 0);

    const bikeCount = garage.services?.bike?.length ?? 0;
    const scootyCount = garage.services?.scooty?.length ?? 0;

    return (
        <View style={styles.root}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Header ──────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{garage.name}</Text>
                        <Text style={styles.headerSub}>{'Garage Details'}</Text>
                    </View>
                    <View style={{ width: 36 }} />
                </View>

                {/* ── Hero card ────────────────────────────────────────────── */}
                <View style={styles.heroCard}>
                    <View style={styles.heroAvatar}>
                        <Ionicons name="storefront" size={32} color={Colors.primary} />
                    </View>
                    <View style={styles.heroInfo}>
                        <Text style={styles.heroName}>{garage.name}</Text>
                        <Text style={styles.heroAddress} numberOfLines={2}>{garage.address || 'Address not set'}</Text>
                        <View style={styles.heroMeta}>
                            <View style={styles.heroBadge}>
                                <Ionicons name="construct-outline" size={12} color={Colors.primary} />
                                <Text style={styles.heroBadgeText}>{String(totalServices) + ' services'}</Text>
                            </View>
                            {garage.phone ? (
                                <View style={styles.heroBadge}>
                                    <Ionicons name="call-outline" size={12} color={Colors.success} />
                                    <Text style={[styles.heroBadgeText, { color: Colors.success }]}>{garage.phone}</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </View>

                {/* ── Garage info ──────────────────────────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{'GARAGE INFO'}</Text>
                    <InfoRow icon="storefront-outline" label="Name" value={garage.name} />
                    <View style={styles.divider} />
                    <InfoRow icon="location-outline" label="Address" value={garage.address || '—'} />
                    {garage.phone ? (
                        <>
                            <View style={styles.divider} />
                            <InfoRow icon="call-outline" label="Phone" value={garage.phone} />
                        </>
                    ) : null}
                </View>

                {/* ── Services & Pricing ───────────────────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{'SERVICES & PRICING'}</Text>

                    {/* Tab switcher */}
                    <View style={styles.tabBar}>
                        {(['bike', 'scooty'] as VehicleTab[]).map((t) => {
                            const isActive = tab === t;
                            const count = t === 'bike' ? bikeCount : scootyCount;
                            const tabAccent = t === 'bike' ? Colors.info : '#6D28D9';
                            const tabBg = t === 'bike' ? Colors.infoLight : '#F5F3FF';
                            return (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.tabItem, isActive && { borderBottomColor: tabAccent, borderBottomWidth: 2 }]}
                                    onPress={() => setTab(t)}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons
                                        name={t === 'bike' ? 'bicycle-outline' : 'speedometer-outline'}
                                        size={16}
                                        color={isActive ? tabAccent : Colors.textTertiary}
                                    />
                                    <Text style={[styles.tabLabel, isActive && { color: tabAccent, fontWeight: '700' }]}>
                                        {t === 'bike' ? 'Bike' : 'Scooty'}
                                    </Text>
                                    <View style={[styles.tabBadge, { backgroundColor: isActive ? tabBg : Colors.surfaceAlt }]}>
                                        <Text style={[styles.tabBadgeText, { color: isActive ? tabAccent : Colors.textTertiary }]}>
                                            {String(count)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {services.length === 0 ? (
                        <View style={styles.emptyServices}>
                            <Ionicons name="construct-outline" size={28} color={Colors.textTertiary} />
                            <Text style={styles.emptyServicesText}>
                                {'No ' + (tab === 'bike' ? 'bike' : 'scooty') + ' services listed yet.'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.priceList}>

                            {/* Complete Servicing — shown first if price exists */}
                            {completePrice != null && (
                                <PriceRow
                                    name="Complete Servicing"
                                    price={completePrice}
                                    isComplete
                                />
                            )}

                            {/* Divider between complete + individual */}
                            {completePrice != null && services.length > 0 && (
                                <View style={styles.sectionDividerRow}>
                                    <View style={styles.sectionDividerLine} />
                                    <Text style={styles.sectionDividerText}>{'Individual Services'}</Text>
                                    <View style={styles.sectionDividerLine} />
                                </View>
                            )}

                            {/* Individual services */}
                            {services.map((svc, idx) => (
                                <PriceRow
                                    key={svc}
                                    name={svc}
                                    price={prices[svc]}
                                    isLast={idx === services.length - 1}
                                />
                            ))}
                        </View>
                    )}

                    {/* Pricing note */}
                    <View style={styles.pricingNote}>
                        <Ionicons name="information-circle-outline" size={14} color={Colors.textTertiary} />
                        <Text style={styles.pricingNoteText}>
                            {'Prices are indicative. Final cost confirmed at garage after inspection.'}
                        </Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── Book Now CTA ─────────────────────────────────────────────── */}
            <View style={styles.footer}>
                <View style={styles.footerLeft}>
                    <Text style={styles.footerLabel}>{'Starting from'}</Text>
                    <Text style={styles.footerPrice}>
                        {(() => {
                            const allPrices = [
                                ...Object.values(garage.service_prices?.bike ?? {}),
                                ...Object.values(garage.service_prices?.scooty ?? {}),
                            ].filter((p) => p > 0);
                            if (allPrices.length === 0) return 'Free estimate';
                            return '₹' + Math.min(...allPrices).toLocaleString('en-IN');
                        })()}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => router.push({ pathname: '/(customer)/book-slot', params: { id: String(garage.id) } } as any)}
                    activeOpacity={0.88}
                >
                    <Ionicons name="calendar-outline" size={18} color="#fff" />
                    <Text style={styles.bookBtnText}>{'Book a Slot'}</Text>
                </TouchableOpacity>
            </View>

            <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
    errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    errorText: { ...Typography.h3, color: Colors.error },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    backBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },
    headerSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },

    content: { gap: Spacing.sm, paddingBottom: Spacing.md },

    heroCard: { backgroundColor: Colors.surface, margin: Spacing.md, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
    heroAvatar: { width: 64, height: 64, borderRadius: Radius.lg, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    heroInfo: { flex: 1 },
    heroName: { ...Typography.h2, color: Colors.textPrimary },
    heroAddress: { ...Typography.body, color: Colors.textSecondary, marginTop: 3 },
    heroMeta: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
    heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryLight, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
    heroBadgeText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

    card: { backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, ...Shadow.sm },
    cardTitle: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm },
    divider: { height: 1, backgroundColor: Colors.borderLight },

    tabBar: { flexDirection: 'row', marginHorizontal: -Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, marginBottom: Spacing.sm },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabLabel: { ...Typography.body, color: Colors.textTertiary },
    tabBadge: { borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
    tabBadgeText: { fontSize: 11, fontWeight: '700' },

    priceList: { gap: 0 },

    sectionDividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.sm },
    sectionDividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
    sectionDividerText: { ...Typography.caption, color: Colors.textTertiary },

    emptyServices: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.xs },
    emptyServicesText: { ...Typography.body, color: Colors.textTertiary },

    pricingNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginTop: Spacing.md, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, padding: Spacing.sm },
    pricingNoteText: { ...Typography.caption, color: Colors.textTertiary, flex: 1, fontStyle: 'italic' },

    footer: { backgroundColor: Colors.surface, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.borderLight },
    footerLeft: { gap: 2 },
    footerLabel: { ...Typography.caption, color: Colors.textTertiary },
    footerPrice: { ...Typography.h2, color: Colors.primary },
    bookBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    bookBtnText: { ...Typography.button, color: '#fff' },
});