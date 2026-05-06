// app/(customer)/cart.tsx

import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useCart } from '../../context/CartContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';

// ── Type meta ─────────────────────────────────────────────────────────────────
const TYPE_META = {
    home: { icon: 'home', color: '#16A34A', bg: '#DCFCE7', label: 'Home' },
    office: { icon: 'briefcase', color: '#2563EB', bg: '#DBEAFE', label: 'Office' },
    other: { icon: 'location-sharp', color: '#FF6B35', bg: '#FFF4F0', label: 'Other' },
} as const;

export default function CartScreen() {
    const router = useRouter();
    const { items, removeItem, clearCart, loading } = useCart();
    const { user } = useAuthStore();

    // ✅ Zustand location store
    const {
        profiles,
        activeProfile,
        setActiveProfile,
    } = useLocationStore();

    // ── Local override state (user can detect GPS on this screen) ─────────────
    // null  = use activeProfile from store (default)
    // {...} = user picked a GPS override on this screen
    const [gpsOverride, setGpsOverride] = useState<{
        address: string; latitude: number; longitude: number;
    } | null>(null);

    const [detectingLoc, setDetectingLoc] = useState(false);

    // ── Resolved delivery location ─────────────────────────────────────────────
    // Priority: GPS override → activeProfile → null
    const resolvedAddress = gpsOverride?.address ?? activeProfile?.address ?? '';
    const resolvedLatitude = gpsOverride?.latitude ?? activeProfile?.latitude ?? null;
    const resolvedLongitude = gpsOverride?.longitude ?? activeProfile?.longitude ?? null;
    const locationReady = !!resolvedAddress.trim();

    // ── Source label ───────────────────────────────────────────────────────────
    const locationSourceLabel = gpsOverride
        ? '📍 Detected via GPS'
        : activeProfile
            ? `📋 From saved — ${activeProfile.label}`
            : '';

    // ── Grand total ────────────────────────────────────────────────────────────
    const grandTotal = items.reduce((sum, item) => sum + (item.estimatedPrice ?? 0), 0);

    // ── Detect GPS location ────────────────────────────────────────────────────
    const detectLocation = async () => {
        setDetectingLoc(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Enable location permission from Settings.');
                return;
            }
            let position = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
            if (!position) {
                position = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
            }
            const [geo] = await Location.reverseGeocodeAsync({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            });
            if (geo) {
                const parts = [geo.name, geo.street, geo.district, geo.city, geo.postalCode]
                    .filter(Boolean);
                setGpsOverride({
                    address: parts.join(', '),
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            }
        } catch {
            Alert.alert('Error', 'Could not detect location. Please try again.');
        } finally {
            setDetectingLoc(false);
        }
    };

    // ── Clear GPS override → fall back to activeProfile ───────────────────────
    const clearOverride = () => setGpsOverride(null);

    // ── Go to checkout ─────────────────────────────────────────────────────────
    const handleProceed = () => {
        console.log('📍 Passing to checkout:', {
            location: resolvedAddress,
            delivery_latitude: resolvedLatitude,
            delivery_longitude: resolvedLongitude,
        });

        router.push({
            pathname: '/(customer)/checkout' as any,
            params: {
                location: resolvedAddress,
                delivery_latitude: String(resolvedLatitude ?? ''),
                delivery_longitude: String(resolvedLongitude ?? ''),
            },
        });
    };

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    // ── Empty cart ─────────────────────────────────────────────────────────────
    if (items.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Cart</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={styles.empty}>
                    <View style={styles.emptyIllustration}>
                        <Ionicons name="cart-outline" size={48} color={Colors.textTertiary} />
                    </View>
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptyDesc}>Browse garages and add a booking to get started.</Text>
                    <TouchableOpacity
                        style={styles.browseBtn}
                        onPress={() => router.replace('/(customer)' as any)}
                    >
                        <Ionicons name="search-outline" size={16} color="#fff" />
                        <Text style={styles.browseBtnText}>Browse Garages</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>

            {/* ── Header ───────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.push('/(customer)/book-slot' as any)}
                >
                    <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {'My Cart (' + String(items.length) + ')'}
                </Text>
                <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() =>
                        Alert.alert('Clear Cart', 'Remove all items from cart?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Clear All', style: 'destructive', onPress: () => clearCart() },
                        ])
                    }
                >
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >

                {/* ── Booking cards ─────────────────────────────────────────── */}
                <Text style={styles.sectionTitle}>BOOKINGS</Text>

                {items.map((item, index) => {
                    const isBike = item.vehicleType === 'bike';
                    return (
                        <View key={item.cartId} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardIndexBadge}>
                                    <Text style={styles.cardIndexText}>{String(index + 1)}</Text>
                                </View>
                                <View style={styles.garageBadge}>
                                    <Ionicons name="storefront-outline" size={14} color={Colors.primary} />
                                </View>
                                <Text style={styles.garageName} numberOfLines={1}>{item.garageName}</Text>
                                <TouchableOpacity
                                    style={styles.removeBtn}
                                    onPress={() =>
                                        Alert.alert('Remove Item', 'Remove this booking from cart?', [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Remove', style: 'destructive', onPress: () => removeItem(item.cartId) },
                                        ])
                                    }
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.cardDivider} />

                            {/* Vehicle */}
                            <View style={styles.detailRow}>
                                <View style={[styles.detailIconWrap, isBike ? styles.detailIconBike : styles.detailIconScooty]}>
                                    <Ionicons
                                        name={isBike ? 'bicycle-outline' : 'speedometer-outline'}
                                        size={13}
                                        color={isBike ? Colors.info : '#6D28D9'}
                                    />
                                </View>
                                <Text style={styles.detailLabel}>Vehicle</Text>
                                <Text style={styles.detailValue} numberOfLines={1}>
                                    {[item.vehicleBrand, item.vehicleModel].filter(Boolean).join(' ')}
                                    {item.vehicleReg ? '  ·  ' + item.vehicleReg : ''}
                                </Text>
                            </View>

                            {/* Services */}
                            <View style={styles.detailRow}>
                                <View style={[styles.detailIconWrap, styles.detailIconService]}>
                                    <Ionicons name="construct-outline" size={13} color={Colors.warning} />
                                </View>
                                <Text style={styles.detailLabel}>Services</Text>
                                <Text style={styles.detailValue} numberOfLines={2}>
                                    {item.services.join(', ')}
                                </Text>
                            </View>

                            {/* Date + Time */}
                            <View style={styles.detailRowInline}>
                                <View style={styles.detailHalf}>
                                    <Ionicons name="calendar-outline" size={13} color={Colors.primary} />
                                    <View>
                                        <Text style={styles.detailLabel}>Date</Text>
                                        <Text style={styles.detailValue}>{item.dateLabel}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailHalfDivider} />
                                <View style={styles.detailHalf}>
                                    <Ionicons name="time-outline" size={13} color={Colors.primary} />
                                    <View>
                                        <Text style={styles.detailLabel}>Time</Text>
                                        <Text style={styles.detailValue}>{item.timeDisplay}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Garage Address */}
                            <View style={styles.detailRow}>
                                <View style={[styles.detailIconWrap, styles.detailIconLocation]}>
                                    <Ionicons name="location-outline" size={13} color={Colors.error} />
                                </View>
                                <Text style={styles.detailLabel}>Address</Text>
                                <Text style={styles.detailValue} numberOfLines={2}>{item.garageAddress}</Text>
                            </View>

                            {/* Estimated price */}
                            {item.estimatedPrice > 0 && (
                                <>
                                    <View style={styles.cardDivider} />
                                    <View style={styles.cardPriceRow}>
                                        <Text style={styles.cardPriceLabel}>Estimated Services</Text>
                                        <Text style={styles.cardPriceValue}>
                                            {'₹' + item.estimatedPrice.toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    );
                })}

                {/* ══════════════════════════════════════════════════════════
                    ✅ DELIVERY LOCATION SECTION
                ══════════════════════════════════════════════════════════ */}
                {/* <Text style={[styles.sectionTitle, { marginTop: Spacing.sm }]}>
                    DELIVERY LOCATION
                </Text> */}

                {/* ══════════════════════════════════════════════════════════
    ✅ DELIVERY LOCATION SECTION
══════════════════════════════════════════════════════════ */}
                <Text style={[styles.sectionTitle, { marginTop: Spacing.sm }]}>
                    DELIVERY LOCATION
                </Text>

                <View style={styles.locationCard}>

                    {/* ── Section header row ──────────────────────────────── */}
                    <View style={styles.locationCardHeader}>
                        <View style={styles.locationCardHeaderLeft}>
                            <Ionicons name="location-outline" size={15} color={Colors.primary} />
                            <Text style={styles.locationCardHeaderTitle}>YOUR LOCATION</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.manageBtn}
                            onPress={() => router.push('/(customer)/location' as any)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="settings-outline" size={13} color={Colors.primary} />
                            <Text style={styles.manageBtnText}>Manage</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ── Active address highlight ─────────────────────────── */}
                    {resolvedAddress ? (
                        <View style={styles.activeAddressCard}>
                            <View style={[
                                styles.activeAddressIcon,
                                {
                                    backgroundColor: gpsOverride
                                        ? Colors.primary + '18'
                                        : TYPE_META[activeProfile?.type ?? 'other'].bg,
                                },
                            ]}>
                                <Ionicons
                                    name={
                                        gpsOverride
                                            ? 'navigate'
                                            : TYPE_META[activeProfile?.type ?? 'other'].icon as any
                                    }
                                    size={18}
                                    color={
                                        gpsOverride
                                            ? Colors.primary
                                            : TYPE_META[activeProfile?.type ?? 'other'].color
                                    }
                                />
                            </View>
                            <View style={styles.activeAddressBody}>
                                <View style={styles.activeAddressTopRow}>
                                    <Text style={styles.activeAddressLabel}>
                                        {gpsOverride ? 'Current Location' : activeProfile?.label}
                                    </Text>
                                    <View style={styles.activeChip}>
                                        <View style={styles.activeChipDot} />
                                        <Text style={styles.activeChipText}>Active</Text>
                                    </View>
                                    {/* Clear GPS override */}
                                    {gpsOverride && (
                                        <TouchableOpacity
                                            onPress={clearOverride}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            style={{ marginLeft: 'auto' }}
                                        >
                                            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <Text style={styles.activeAddressText} numberOfLines={2}>
                                    {resolvedAddress}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.noLocationRow}
                            onPress={() => router.push('/(customer)/location' as any)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="location-outline" size={18} color={Colors.textTertiary} />
                            <Text style={styles.noLocationText}>No delivery location set</Text>
                            <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
                        </TouchableOpacity>
                    )}

                    {/* ── Switch saved profiles ────────────────────────────── */}
                    {profiles.length > 1 && (
                        <>
                            <View style={styles.switchDivider}>
                                <View style={styles.switchDividerLine} />
                                <Text style={styles.switchDividerText}>Switch to</Text>
                                <View style={styles.switchDividerLine} />
                            </View>

                            <View style={styles.profileChipRow}>
                                {profiles
                                    .filter((p) => !(activeProfile?.id === p.id && !gpsOverride))
                                    .map((p) => {
                                        const meta = TYPE_META[p.type];
                                        return (
                                            <TouchableOpacity
                                                key={p.id}
                                                style={styles.profileChip}
                                                onPress={() => {
                                                    setActiveProfile(p);
                                                    setGpsOverride(null);
                                                }}
                                                activeOpacity={0.75}
                                            >
                                                <View style={[styles.profileChipIcon, { backgroundColor: meta.bg }]}>
                                                    <Ionicons name={meta.icon as any} size={13} color={meta.color} />
                                                </View>
                                                <Text style={styles.profileChipLabel} numberOfLines={1}>
                                                    {p.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}

                                {/* Add new shortcut */}
                                <TouchableOpacity
                                    style={styles.profileChipAdd}
                                    onPress={() => router.push('/(customer)/location' as any)}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="add" size={13} color={Colors.primary} />
                                    <Text style={styles.profileChipAddText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* ── GPS detect button ────────────────────────────────── */}
                    <TouchableOpacity
                        style={[styles.detectBtn, detectingLoc && { opacity: 0.7 }]}
                        onPress={detectLocation}
                        disabled={detectingLoc}
                        activeOpacity={0.8}
                    >
                        {detectingLoc ? (
                            <>
                                <ActivityIndicator size="small" color={Colors.primary} />
                                <Text style={styles.detectBtnText}>Detecting…</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                                <Text style={styles.detectBtnText}>
                                    {gpsOverride ? 'Re-detect Location' : 'Use Current GPS Location'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.locationHintRow}>
                        <Ionicons name="information-circle-outline" size={13} color={Colors.textTertiary} />
                        <Text style={styles.locationHint}>
                            Location is shared with the garage for pickup coordination.
                        </Text>
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <View style={styles.footer}>
                <View style={styles.footerMeta}>
                    <Text style={styles.footerItemCount}>
                        {String(items.length) + ' booking' + (items.length > 1 ? 's' : '') + ' in cart'}
                    </Text>
                    {grandTotal > 0 && (
                        <Text style={styles.footerTotal}>
                            {'Est. ₹' + grandTotal.toLocaleString('en-IN')}
                        </Text>
                    )}
                </View>

                {locationReady && (
                    <View style={styles.locationConfirmedRow}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                        <Text style={styles.locationConfirmedText}>
                            {gpsOverride ? 'GPS location set' : `Delivering to: ${activeProfile?.label}`}
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.checkoutBtn, !locationReady && styles.checkoutBtnDisabled]}
                    onPress={handleProceed}
                    disabled={!locationReady}
                    activeOpacity={0.88}
                >
                    <Ionicons name="receipt-outline" size={20} color="#fff" />
                    <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
                    <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>

                {!locationReady && (
                    <Text style={styles.checkoutHint}>Set your delivery location above to proceed</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 56, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    backBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },
    clearBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },

    content: { padding: Spacing.md, gap: Spacing.sm },
    sectionTitle: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.xs },

    card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm, ...Shadow.sm },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    cardIndexBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    cardIndexText: { fontSize: 11, color: '#fff', fontWeight: '800' },
    garageBadge: { width: 28, height: 28, borderRadius: Radius.sm, backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
    garageName: { ...Typography.h3, color: Colors.textPrimary, flex: 1 },
    removeBtn: { padding: 2 },
    cardDivider: { height: 1, backgroundColor: Colors.borderLight },

    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    detailIconWrap: { width: 24, height: 24, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    detailIconBike: { backgroundColor: Colors.infoLight },
    detailIconScooty: { backgroundColor: '#F5F3FF' },
    detailIconService: { backgroundColor: '#FFFBEB' },
    detailIconLocation: { backgroundColor: '#FEE2E2' },
    detailLabel: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '700', width: 54 },
    detailValue: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '500', flex: 1, lineHeight: 18 },

    detailRowInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.sm },
    detailHalf: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    detailHalfDivider: { width: 1, height: 32, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.sm },

    cardPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardPriceLabel: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '600' },
    cardPriceValue: { ...Typography.body, color: Colors.primary, fontWeight: '800' },

    // ── ✅ Location section ───────────────────────────────────────────────────
    // locationCard: {
    //     backgroundColor: Colors.surface, borderRadius: Radius.lg,
    //     borderWidth: 1, borderColor: Colors.border,
    //     padding: Spacing.md, gap: Spacing.sm, ...Shadow.sm,
    // },
    locationActiveRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    },
    locationIconWrap: {
        width: 38, height: 38, borderRadius: 19,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 2,
    },
    locationSourceLabel: {
        ...Typography.overline, color: Colors.textTertiary,
        fontWeight: '700', fontSize: 10, marginBottom: 2,
    },
    locationText: { ...Typography.body, color: Colors.textPrimary, flex: 1, lineHeight: 22 },
    locationPlaceholder: { ...Typography.body, color: Colors.textTertiary, flex: 1 },

    // Switch chips
    // switchDivider: {
    //     flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    //     paddingVertical: 4,
    // },
    // switchDividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
    // switchDividerText: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '600' },

    // profileChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    // profileChip: {
    //     flexDirection: 'row', alignItems: 'center', gap: 5,
    //     backgroundColor: Colors.bg, borderRadius: Radius.full,
    //     paddingHorizontal: 12, paddingVertical: 7,
    //     borderWidth: 1.5, borderColor: Colors.border,
    // },
    // profileChipIcon: {
    //     width: 20, height: 20, borderRadius: 10,
    //     alignItems: 'center', justifyContent: 'center',
    // },
    // profileChipLabel: {
    //     ...Typography.caption, color: Colors.textPrimary,
    //     fontWeight: '600', maxWidth: 90,
    // },
    profileChipManage: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.surfaceAlt,
        borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 7,
        borderWidth: 1, borderColor: Colors.border,
    },
    profileChipManageText: {
        ...Typography.caption, color: Colors.textTertiary, fontWeight: '600',
    },

    // detectBtn: {
    //     flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    //     backgroundColor: Colors.primary + '18', borderRadius: Radius.md,
    //     paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    //     borderWidth: 1, borderColor: Colors.primary, alignSelf: 'flex-start',
    // },
    // detectBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

    // locationHintRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    // locationHint: { ...Typography.caption, color: Colors.textTertiary, flex: 1 },

    // ── Empty ─────────────────────────────────────────────────────────────────
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: 32 },
    emptyIllustration: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
    emptyTitle: { ...Typography.h2, color: Colors.textSecondary },
    emptyDesc: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },
    browseBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 24, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
    browseBtnText: { ...Typography.body, color: '#fff', fontWeight: '700' },

    // ── Footer ────────────────────────────────────────────────────────────────
    footer: { padding: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight, gap: Spacing.xs },
    footerMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    footerItemCount: { ...Typography.caption, color: Colors.textTertiary },
    footerTotal: { ...Typography.caption, color: Colors.primary, fontWeight: '800' },
    locationConfirmedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locationConfirmedText: { ...Typography.caption, color: Colors.success, fontWeight: '600' },
    checkoutBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    checkoutBtnDisabled: { backgroundColor: Colors.primary + '55' },
    checkoutBtnText: { ...Typography.button, color: '#fff', flex: 1, textAlign: 'center' },
    checkoutHint: { ...Typography.caption, color: Colors.textTertiary, textAlign: 'center' },
    // ── Delivery location card ─────────────────────────────────────────────────
    locationCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        borderWidth: 1, borderColor: Colors.border,
        overflow: 'hidden', ...Shadow.sm,
    },
    locationCardHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.md, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    locationCardHeaderLeft: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    locationCardHeaderTitle: {
        fontSize: 10, fontWeight: '800', color: Colors.textTertiary,
        textTransform: 'uppercase', letterSpacing: 0.9,
    },
    manageBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.primary + '18',
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: Radius.full,
        borderWidth: 1, borderColor: Colors.primary + '55',
    },
    manageBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

    activeAddressCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
        padding: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
        backgroundColor: Colors.primary + '06',
    },
    activeAddressIcon: {
        width: 42, height: 42, borderRadius: Radius.md,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    activeAddressBody: { flex: 1, gap: 4 },
    activeAddressTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    activeAddressLabel: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700' },
    activeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#DCFCE7', borderRadius: Radius.full,
        paddingHorizontal: 8, paddingVertical: 2,
    },
    activeChipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
    activeChipText: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
    activeAddressText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 17 },

    noLocationRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        padding: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    noLocationText: { ...Typography.body, color: Colors.textTertiary, flex: 1 },

    switchDivider: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.md, paddingVertical: 10,
    },
    switchDividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
    switchDividerText: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '600' },

    profileChipRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
        paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    },
    profileChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.bg, borderRadius: Radius.full,
        paddingHorizontal: 12, paddingVertical: 7,
        borderWidth: 1, borderColor: Colors.border,
    },
    profileChipIcon: {
        width: 22, height: 22, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center',
    },
    profileChipLabel: {
        ...Typography.caption, color: Colors.textPrimary,
        fontWeight: '600', maxWidth: 100,
    },
    profileChipAdd: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.primary + '12',
        borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 7,
        borderWidth: 1, borderColor: Colors.primary + '44',
    },
    profileChipAddText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

    detectBtn: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
        backgroundColor: Colors.primary + '18', borderRadius: Radius.md,
        paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
        borderWidth: 1, borderColor: Colors.primary,
        alignSelf: 'flex-start', margin: Spacing.md, marginTop: 0,
    },
    detectBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

    locationHintRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
        paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    },
    locationHint: { ...Typography.caption, color: Colors.textTertiary, flex: 1 },
});