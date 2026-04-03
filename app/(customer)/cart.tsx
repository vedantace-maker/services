// app/(customer)/cart.tsx

import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useCart } from '../../context/CartContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

export default function CartScreen() {
    const router = useRouter();
    const { items, removeItem, clearCart, loading } = useCart();

    const [locationText, setLocationText] = useState('');
    const [detectingLoc, setDetectingLoc] = useState(false);
    const [locationGranted, setLocationGranted] = useState(false);

    // ── Grand total from actual service prices ────────────────────────────────
    const grandTotal = items.reduce((sum, item) => sum + (item.estimatedPrice ?? 0), 0);

    // ── Detect location ───────────────────────────────────────────────────────
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
                const parts = [geo.name, geo.street, geo.district, geo.city, geo.postalCode].filter(Boolean);
                setLocationText(parts.join(', '));
                setLocationGranted(true);
            }
        } catch {
            Alert.alert('Error', 'Could not detect location. Please try again.');
        } finally {
            setDetectingLoc(false);
        }
    };

    // ── Go to checkout ────────────────────────────────────────────────────────
    const handleProceed = () => {
        router.push({
            pathname: '/(customer)/checkout' as any,
            params: { location: locationText },
        });
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    // ── Empty cart ────────────────────────────────────────────────────────────
    if (items.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{'My Cart'}</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={styles.empty}>
                    <View style={styles.emptyIllustration}>
                        <Ionicons name="cart-outline" size={48} color={Colors.textTertiary} />
                    </View>
                    <Text style={styles.emptyTitle}>{'Your cart is empty'}</Text>
                    <Text style={styles.emptyDesc}>{'Browse garages and add a booking to get started.'}</Text>
                    <TouchableOpacity
                        style={styles.browseBtn}
                        onPress={() => router.replace('/(customer)' as any)}
                    >
                        <Ionicons name="search-outline" size={16} color="#fff" />
                        <Text style={styles.browseBtnText}>{'Browse Garages'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
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

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Booking cards ───────────────────────────────────────────── */}
                <Text style={styles.sectionTitle}>{'BOOKINGS'}</Text>

                {items.map((item, index) => {
                    const isBike = item.vehicleType === 'bike';
                    return (
                        <View key={item.cartId} style={styles.card}>

                            {/* Card header */}
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
                                <Text style={styles.detailLabel}>{'Vehicle'}</Text>
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
                                <Text style={styles.detailLabel}>{'Services'}</Text>
                                <Text style={styles.detailValue} numberOfLines={2}>
                                    {item.services.join(', ')}
                                </Text>
                            </View>

                            {/* Date + Time inline */}
                            <View style={styles.detailRowInline}>
                                <View style={styles.detailHalf}>
                                    <Ionicons name="calendar-outline" size={13} color={Colors.primary} />
                                    <View>
                                        <Text style={styles.detailLabel}>{'Date'}</Text>
                                        <Text style={styles.detailValue}>{item.dateLabel}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailHalfDivider} />
                                <View style={styles.detailHalf}>
                                    <Ionicons name="time-outline" size={13} color={Colors.primary} />
                                    <View>
                                        <Text style={styles.detailLabel}>{'Time'}</Text>
                                        <Text style={styles.detailValue}>{item.timeDisplay}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Address */}
                            <View style={styles.detailRow}>
                                <View style={[styles.detailIconWrap, styles.detailIconLocation]}>
                                    <Ionicons name="location-outline" size={13} color={Colors.error} />
                                </View>
                                <Text style={styles.detailLabel}>{'Address'}</Text>
                                <Text style={styles.detailValue} numberOfLines={2}>{item.garageAddress}</Text>
                            </View>

                            {/* Est. price */}
                            {item.estimatedPrice > 0 && (
                                <>
                                    <View style={styles.cardDivider} />
                                    <View style={styles.cardPriceRow}>
                                        <Text style={styles.cardPriceLabel}>{'Estimated Services'}</Text>
                                        <Text style={styles.cardPriceValue}>
                                            {'₹' + item.estimatedPrice.toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    );
                })}

                {/* ── Price preview ────────────────────────────────────────────── */}
                {grandTotal > 0 && (
                    <View style={styles.priceSummary}>
                        <Text style={styles.sectionTitle}>{'SERVICES ESTIMATE'}</Text>
                        {items.map((item) =>
                            item.estimatedPrice > 0 ? (
                                <View key={item.cartId} style={styles.priceSummaryRow}>
                                    <Text style={styles.priceSummaryGarage} numberOfLines={1}>{item.garageName}</Text>
                                    <Text style={styles.priceSummaryAmount}>
                                        {'₹' + item.estimatedPrice.toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            ) : null
                        )}
                        <View style={styles.priceSummaryDivider} />
                        <View style={styles.priceTotalRow}>
                            <Text style={styles.priceTotalLabel}>{'Services Subtotal'}</Text>
                            <Text style={styles.priceTotalValue}>
                                {'₹' + grandTotal.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <Text style={styles.priceDisclaimer}>
                            {'* Taxes, platform fee & delivery added at checkout.'}
                        </Text>
                    </View>
                )}

                {/* ── Location ─────────────────────────────────────────────────── */}
                <Text style={[styles.sectionTitle, { marginTop: Spacing.sm }]}>{'YOUR LOCATION'}</Text>
                <View style={styles.locationCard}>
                    <View style={styles.locationInputRow}>
                        <View style={styles.locationIconWrap}>
                            <Ionicons
                                name={locationGranted ? 'location' : 'location-outline'}
                                size={18}
                                color={locationGranted ? Colors.primary : Colors.textTertiary}
                            />
                        </View>
                        <Text
                            style={[styles.locationText, !locationText && styles.locationPlaceholder]}
                            numberOfLines={3}
                        >
                            {locationText || 'No location selected yet'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.detectBtn}
                        onPress={detectLocation}
                        disabled={detectingLoc}
                        activeOpacity={0.8}
                    >
                        {detectingLoc ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                            <>
                                <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                                <Text style={styles.detectBtnText}>
                                    {locationGranted ? 'Re-detect Location' : 'Use Current Location'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.locationHintRow}>
                        <Ionicons name="information-circle-outline" size={13} color={Colors.textTertiary} />
                        <Text style={styles.locationHint}>
                            {'Location is shared with the garage for pickup coordination.'}
                        </Text>
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
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

                {locationGranted && (
                    <View style={styles.locationConfirmedRow}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                        <Text style={styles.locationConfirmedText}>{'Location set'}</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.checkoutBtn, !locationText.trim() && styles.checkoutBtnDisabled]}
                    onPress={handleProceed}
                    disabled={!locationText.trim()}
                    activeOpacity={0.88}
                >
                    <Ionicons name="receipt-outline" size={20} color="#fff" />
                    <Text style={styles.checkoutBtnText}>{'Proceed to Checkout'}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>

                {!locationText.trim() && (
                    <Text style={styles.checkoutHint}>{'Set your location above to proceed'}</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    backBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },
    clearBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },

    content: { padding: Spacing.md, gap: Spacing.sm },
    sectionTitle: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.xs },

    card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm, ...Shadow.sm },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    cardIndexBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    cardIndexText: { fontSize: 11, color: '#fff', fontWeight: '800' },
    garageBadge: { width: 28, height: 28, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
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

    priceSummary: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm, ...Shadow.sm },
    priceSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    priceSummaryGarage: { ...Typography.body, color: Colors.textSecondary, flex: 1, marginRight: Spacing.sm },
    priceSummaryAmount: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700' },
    priceSummaryDivider: { height: 1, backgroundColor: Colors.borderLight },
    priceTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    priceTotalLabel: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700' },
    priceTotalValue: { ...Typography.h2, color: Colors.primary },
    priceDisclaimer: { ...Typography.caption, color: Colors.textTertiary, fontStyle: 'italic' },

    locationCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm, ...Shadow.sm },
    locationInputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    locationIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    locationText: { ...Typography.body, color: Colors.textPrimary, flex: 1, lineHeight: 22 },
    locationPlaceholder: { color: Colors.textTertiary },
    detectBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primaryLight, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.primary, alignSelf: 'flex-start' },
    detectBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
    locationHintRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    locationHint: { ...Typography.caption, color: Colors.textTertiary, flex: 1 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: 32 },
    emptyIllustration: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
    emptyTitle: { ...Typography.h2, color: Colors.textSecondary },
    emptyDesc: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },
    browseBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 24, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
    browseBtnText: { ...Typography.body, color: '#fff', fontWeight: '700' },

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
});