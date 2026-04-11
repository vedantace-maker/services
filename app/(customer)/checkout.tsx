// app/(customer)/checkout.tsx

import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCart } from '../../context/CartContext';
import { createBooking } from '../../utils/services/bookingService';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { useUIStore } from '../../store/uiStore';

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM FEE CONFIG (only these are fixed — service prices come from cart)
// ─────────────────────────────────────────────────────────────────────────────
const SERVICE_FEE_RATE = 0.05;   // 5% platform fee on services subtotal
const DELIVERY_CHARGE = 149;    // flat pickup & delivery fee
const GST_RATE = 0.18;   // 18% GST
const CESS_RATE = 0.01;   // 1% Infrastructure Cess

// ─────────────────────────────────────────────────────────────────────────────
// PROMO CODES
// ─────────────────────────────────────────────────────────────────────────────
type PromoType = { type: 'percent' | 'flat'; value: number; label: string };
const PROMO_CODES: Record<string, PromoType> = {
    'FIRST50': { type: 'percent', value: 50, label: '50% off platform fee' },
    'SAVE100': { type: 'flat', value: 100, label: '₹100 off total' },
    'WELCOME': { type: 'percent', value: 10, label: '10% off total' },
    'AUTOCARE': { type: 'flat', value: 200, label: '₹200 off total' },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    '₹' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function getTimestamp() {
    const now = new Date();
    return (
        `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}` +
        ` // ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    );
}

function getRefNode() {
    return 'AT-' + Math.floor(100 + Math.random() * 900);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function CheckoutScreen() {
    const router = useRouter();
    const { setBookSlotShouldReset } = useUIStore();
    const { location } = useLocalSearchParams<{ location: string }>();
    const { items, clearCart } = useCart();
    const { toast, showToast, hideToast } = useToast();

    const [promoInput, setPromoInput] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<PromoType | null>(null);
    const [promoError, setPromoError] = useState('');
    const [booking, setBooking] = useState(false);

    const [timestamp] = useState(getTimestamp);
    const [refNode] = useState(getRefNode);
    const [manifestId] = useState(() => 'MNF-' + Date.now().toString(36).toUpperCase());

    // ── Pricing — all from actual cart item service prices ────────────────────
    // 01 — Services: sum of estimated prices from garage
    const servicesSubtotal = items.reduce((sum, item) => sum + (item.estimatedPrice ?? 0), 0);

    // 02 — Platform fee: 5% of services
    const platformFee = Math.round(servicesSubtotal * SERVICE_FEE_RATE * 100) / 100;

    // 03 — Delivery: flat
    const delivery = DELIVERY_CHARGE;

    // Subtotal before discount
    const subtotal = servicesSubtotal + platformFee + delivery;

    // Discount from promo
    let discount = 0;
    if (appliedPromo) {
        if (appliedPromo.type === 'flat') discount = appliedPromo.value;
        if (appliedPromo.type === 'percent') discount = Math.round((subtotal * appliedPromo.value) / 100 * 100) / 100;
    }
    const discountedSubtotal = Math.max(0, subtotal - discount);

    // Taxes on discounted subtotal
    const gst = Math.round(discountedSubtotal * GST_RATE * 100) / 100;
    const cess = Math.round(discountedSubtotal * CESS_RATE * 100) / 100;

    // Grand total
    const grandTotal = Math.round((discountedSubtotal + gst + cess) * 100) / 100;

    // ── Promo ─────────────────────────────────────────────────────────────────
    const applyPromo = () => {
        const code = promoInput.trim().toUpperCase();
        if (!code) { setPromoError('Enter a promo code.'); return; }
        const found = PROMO_CODES[code];
        if (!found) {
            setPromoError('Invalid promo code.');
            setAppliedPromo(null);
            return;
        }
        setAppliedPromo(found);
        setPromoError('');
        showToast(`Promo applied: ${found.label}`, 'success');
    };

    const removePromo = () => {
        setAppliedPromo(null);
        setPromoInput('');
        setPromoError('');
    };

    const handleBookingSuccess = () => {
        setBookSlotShouldReset(true);   // ✅ tells book-slot to reset next time
        router.replace('/(customer)' as any);
    };

    // ── Book all items ────────────────────────────────────────────────────────
    // ── Book all items ────────────────────────────────────────────────────────
    const handleBook = async () => {
        if (items.length === 0) return;
        setBooking(true);
        const failed: number[] = [];

        // ── Billing snapshot — calculated once for the whole order ────────────
        const billingPayload = {
            services_subtotal: servicesSubtotal,
            platform_fee: platformFee,
            delivery_charge: delivery,
            discount: discount,
            promo_code: appliedPromo ? promoInput.trim().toUpperCase() : '',
            gst: gst,
            cess: cess,
            grand_total: grandTotal,
            manifest_id: manifestId,
            payment_status: 'pending',
            payment_method: 'cash',
        };

        // console.log('──────────────────────────────────────');
        // console.log('💰 servicesSubtotal :', servicesSubtotal);
        // console.log('💰 platformFee      :', platformFee);
        // console.log('💰 gst              :', gst);
        // console.log('💰 grandTotal       :', grandTotal);
        // console.log('📦 Full billingPayload:', JSON.stringify(billingPayload, null, 2));
        // console.log('──────────────────────────────────────');

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
                await createBooking({
                    // ── Booking fields ───────────────────────────────────────
                    garage: item.garageId,
                    date: item.date,
                    time: item.timeRaw,
                    vehicle_type: item.vehicleType as 'bike' | 'scooty',
                    bike_details: [item.vehicleBrand, item.vehicleModel, item.vehicleReg]
                        .filter(Boolean).join(' '),
                    selected_services: item.services.join(', '),
                    // estimated_price: item.estimatedPrice || 0,

                    // ── Billing fields ───────────────────────────────────────
                    ...billingPayload,
                });
            } catch {
                failed.push(i + 1);
            }
        }

        setBooking(false);

        if (failed.length > 0) {
            Alert.alert(
                'Partial Failure',
                `Booking${failed.length > 1 ? 's' : ''} #${failed.join(', #')} failed. Others were placed successfully.`,
                [{ text: 'OK' }]
            );
        } else {
            await clearCart();
            showToast('All bookings confirmed! 🎉', 'success');
            setTimeout(() => router.replace('/(customer)/my-bookings' as any), 1200);
        }

        handleBookingSuccess();
    };

    return (
        <View style={styles.root}>

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{'BILLING_DETAILS'}</Text>
                <TouchableOpacity
                    style={styles.helpBtn}
                    onPress={() => showToast('Prices are estimates. Final amount confirmed at garage.', 'success')}
                >
                    <Ionicons name="help-circle" size={22} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                {/* ── MANIFEST CARD ────────────────────────────────────────────── */}
                <View style={styles.manifestCard}>
                    <View style={styles.manifestTopRow}>
                        <View>
                            <Text style={styles.manifestIdLabel}>{'MANIFEST_ID'}</Text>
                            <Text style={styles.manifestIdValue}>{manifestId}</Text>
                        </View>
                        <View style={styles.manifestTimestampBox}>
                            <Text style={styles.manifestTimestampLabel}>{'TIMESTAMP'}</Text>
                            <Text style={styles.manifestTimestampValue}>{timestamp}</Text>
                        </View>
                    </View>
                    <View style={styles.manifestMetaRow}>
                        <View style={styles.manifestStatusPill}>
                            <View style={styles.manifestDot} />
                            <Text style={styles.manifestStatusText}>{'ST_ACTIVE_SESSION'}</Text>
                        </View>
                        <View style={styles.manifestRefBox}>
                            <Ionicons name="git-network-outline" size={12} color={Colors.textSecondary} />
                            <Text style={styles.manifestRefText}>{'REF_NODE: ' + refNode}</Text>
                        </View>
                    </View>
                    {/* Booking count badge */}
                    <View style={styles.manifestCountRow}>
                        <Ionicons name="cart-outline" size={13} color={Colors.primary} />
                        <Text style={styles.manifestCountText}>
                            {String(items.length) + ' booking' + (items.length > 1 ? 's' : '') + ' in this order'}
                        </Text>
                    </View>
                </View>

                {/* ── ITEMIZED SERVICES ────────────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{'ITEMIZED_SERVICES'}</Text>

                    {/* Per-garage breakdown */}
                    {items.map((item, i) => (
                        <React.Fragment key={item.cartId}>
                            <View style={styles.lineItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.lineItemCode}>
                                        {String(i + 1).padStart(2, '0') + '_SVC'}
                                    </Text>
                                    <Text style={styles.lineItemName} numberOfLines={1}>
                                        {item.garageName}
                                    </Text>
                                    <Text style={styles.lineItemSub} numberOfLines={1}>
                                        {item.services.join(', ')}
                                    </Text>
                                    <Text style={styles.lineItemSub}>
                                        {item.dateLabel + '  ·  ' + item.timeDisplay}
                                    </Text>
                                </View>
                                <Text style={styles.lineItemAmount}>
                                    {item.estimatedPrice > 0 ? fmt(item.estimatedPrice) : '—'}
                                </Text>
                            </View>
                            {i < items.length - 1 && <View style={styles.itemDivider} />}
                        </React.Fragment>
                    ))}

                    <View style={styles.itemDividerThick} />

                    {/* Services subtotal */}
                    <View style={styles.lineItem}>
                        <View>
                            <Text style={styles.lineItemCode}>{'SUB_TOTAL'}</Text>
                            <Text style={styles.lineItemName}>{'Services Subtotal'}</Text>
                        </View>
                        <Text style={[styles.lineItemAmount, { color: Colors.primary }]}>
                            {fmt(servicesSubtotal)}
                        </Text>
                    </View>

                    <View style={styles.itemDivider} />

                    {/* Platform fee */}
                    <View style={styles.lineItem}>
                        <View>
                            <Text style={styles.lineItemCode}>{'FEE_5PCT'}</Text>
                            <Text style={styles.lineItemName}>{'Platform Fee (5%)'}</Text>
                        </View>
                        <Text style={styles.lineItemAmount}>{fmt(platformFee)}</Text>
                    </View>

                    <View style={styles.itemDivider} />

                    {/* Delivery */}
                    <View style={styles.lineItem}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.lineItemCode}>{'LOGI_DELIVERY'}</Text>
                            <Text style={styles.lineItemName}>{'Pickup & Delivery (Express)'}</Text>
                            {!!location && (
                                <Text style={styles.lineItemSub} numberOfLines={1}>{location}</Text>
                            )}
                        </View>
                        <Text style={styles.lineItemAmount}>{fmt(delivery)}</Text>
                    </View>

                    {/* Discount row */}
                    {appliedPromo && (
                        <>
                            <View style={styles.itemDivider} />
                            <View style={styles.lineItem}>
                                <View>
                                    <Text style={[styles.lineItemCode, { color: Colors.success }]}>{'PROMO_DISC'}</Text>
                                    <Text style={[styles.lineItemName, { color: Colors.success }]}>
                                        {promoInput.toUpperCase() + ' (' + appliedPromo.label + ')'}
                                    </Text>
                                </View>
                                <Text style={[styles.lineItemAmount, { color: Colors.success }]}>
                                    {'-' + fmt(discount)}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* ── TAX COMPLIANCE ───────────────────────────────────────────── */}
                <View style={styles.taxBox}>
                    <Text style={styles.taxLabel}>{'TAX_COMPLIANCE'}</Text>
                    <View style={styles.taxRow}>
                        <Text style={styles.taxName}>{'GST (18%)'}</Text>
                        <Text style={styles.taxAmount}>{fmt(gst)}</Text>
                    </View>
                    <View style={styles.taxRow}>
                        <Text style={styles.taxName}>{'Infrastructure Cess (1%)'}</Text>
                        <Text style={styles.taxAmount}>{fmt(cess)}</Text>
                    </View>
                </View>

                {/* ── PROMO CODE ───────────────────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.promoHeaderRow}>
                        <Text style={styles.sectionLabel}>{'PROMO_CODE'}</Text>
                        <TouchableOpacity
                            onPress={() => showToast('Codes: FIRST50 · SAVE100 · WELCOME · AUTOCARE', 'success')}
                        >
                            <Text style={styles.viewOffersText}>{'VIEW_OFFERS'}</Text>
                        </TouchableOpacity>
                    </View>

                    {appliedPromo ? (
                        <View style={styles.promoAppliedRow}>
                            <View style={styles.promoAppliedPill}>
                                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                                <Text style={styles.promoAppliedCode}>{promoInput.toUpperCase()}</Text>
                                <Text style={styles.promoAppliedLabel}>{appliedPromo.label}</Text>
                            </View>
                            <TouchableOpacity onPress={removePromo}>
                                <Ionicons name="close-circle" size={20} color={Colors.error} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.promoInputRow}>
                            <TextInput
                                style={styles.promoInput}
                                placeholder="ENTER_CODE"
                                placeholderTextColor={Colors.textTertiary}
                                value={promoInput}
                                onChangeText={(t) => { setPromoInput(t); setPromoError(''); }}
                                autoCapitalize="characters"
                            />
                            <TouchableOpacity style={styles.applyBtn} onPress={applyPromo}>
                                <Text style={styles.applyBtnText}>{'APPLY'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!!promoError && <Text style={styles.promoError}>{promoError}</Text>}
                </View>

                {/* ── GRAND TOTAL ──────────────────────────────────────────────── */}
                <View style={styles.grandTotalBox}>
                    <View>
                        <Text style={styles.grandTotalLabel}>{'GRAND_TOTAL'}</Text>
                        <Text style={styles.grandTotalSub}>{'FINAL_PAYMENT_DUE'}</Text>
                    </View>
                    <Text style={styles.grandTotalAmount}>{fmt(grandTotal)}</Text>
                </View>

                {/* Estimate disclaimer */}
                <View style={styles.disclaimerBox}>
                    <Ionicons name="information-circle-outline" size={14} color={Colors.textTertiary} />
                    <Text style={styles.disclaimerText}>
                        {'Service prices are estimates from garage listings. Final amount is confirmed after inspection at the garage.'}
                    </Text>
                </View>

                {/* ── ENCRYPTED TRANSACTION ────────────────────────────────────── */}
                <View style={styles.encryptedBox}>
                    <View style={styles.encryptedLeft}>
                        <Ionicons name="lock-closed" size={14} color={Colors.textTertiary} />
                        <Text style={styles.encryptedText}>{'ENCRYPTED_TRANSACTION'}</Text>
                    </View>
                    <View style={styles.paymentIconBox}>
                        <Ionicons name="card" size={20} color={Colors.textSecondary} />
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ── PROCEED TO PAY ───────────────────────────────────────────────── */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.payBtn, booking && styles.payBtnDisabled]}
                    onPress={handleBook}
                    disabled={booking}
                    activeOpacity={0.88}
                >
                    {booking ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <View>
                                <Text style={styles.payBtnTitle}>{'PROCEED_TO_PAY'}</Text>
                                <Text style={styles.payBtnSub}>{'EST_SECURE_GATEWAY_V.04'}</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={22} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
                <Text style={styles.termsText}>
                    {'BY PROCEEDING, YOU AGREE TO THE TECHNICAL SERVICE AGREEMENT.'}
                </Text>
            </View>

            <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const MANIFEST_BG = '#FEE9DF';
const CODE_COLOR = Colors.primary;

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    backBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: 'monospace', fontSize: 14, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 1.5 },
    helpBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

    content: { padding: Spacing.md, gap: Spacing.md },

    // Manifest
    manifestCard: { backgroundColor: MANIFEST_BG, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, ...Shadow.sm },
    manifestTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    manifestIdLabel: { fontSize: 9, fontWeight: '700', color: CODE_COLOR, letterSpacing: 1.2, textTransform: 'uppercase' },
    manifestIdValue: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 1, marginTop: 2 },
    manifestTimestampBox: { alignItems: 'flex-end' },
    manifestTimestampLabel: { fontSize: 9, fontWeight: '700', color: CODE_COLOR, letterSpacing: 1.2, textTransform: 'uppercase' },
    manifestTimestampValue: { fontSize: 11, color: Colors.textPrimary, fontWeight: '600', textAlign: 'right', marginTop: 2 },
    manifestMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: 4 },
    manifestStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    manifestDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: CODE_COLOR },
    manifestStatusText: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.8 },
    manifestRefBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    manifestRefText: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600' },
    manifestCountRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 5, alignSelf: 'flex-start' },
    manifestCountText: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 0.3 },

    // Sections
    section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm, ...Shadow.sm },
    sectionLabel: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 1.5, textTransform: 'uppercase' },

    // Line items
    lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
    lineItemCode: { fontSize: 9, fontWeight: '700', color: CODE_COLOR, letterSpacing: 1.2, marginBottom: 2 },
    lineItemName: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600', maxWidth: 220 },
    lineItemSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
    lineItemAmount: { ...Typography.h3, color: Colors.textPrimary, fontWeight: '700', minWidth: 72, textAlign: 'right' },
    itemDivider: { height: 1, backgroundColor: Colors.borderLight },
    itemDividerThick: { height: 1.5, backgroundColor: Colors.border, marginVertical: Spacing.xs },

    // Tax
    taxBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.xs },
    taxLabel: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 1.5, marginBottom: 4 },
    taxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    taxName: { ...Typography.body, color: Colors.textSecondary },
    taxAmount: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600' },

    // Promo
    promoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    viewOffersText: { fontSize: 10, fontWeight: '800', color: CODE_COLOR, letterSpacing: 1 },
    promoInputRow: { flexDirection: 'row', gap: Spacing.sm },
    promoInput: { flex: 1, backgroundColor: Colors.bg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 12, fontFamily: 'monospace', fontSize: 14, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 2 },
    applyBtn: { backgroundColor: Colors.textPrimary, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
    applyBtnText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
    promoAppliedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    promoAppliedPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
    promoAppliedCode: { fontSize: 14, fontWeight: '800', color: Colors.success, letterSpacing: 1 },
    promoAppliedLabel: { ...Typography.caption, color: Colors.textTertiary, marginLeft: 4 },
    promoError: { ...Typography.caption, color: Colors.error, fontWeight: '600' },

    // Grand total
    grandTotalBox: { backgroundColor: MANIFEST_BG, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#F5C4A8', ...Shadow.sm },
    grandTotalLabel: { fontSize: 16, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 1 },
    grandTotalSub: { fontSize: 9, fontWeight: '700', color: CODE_COLOR, letterSpacing: 1.2, marginTop: 3 },
    grandTotalAmount: { fontSize: 28, fontWeight: '900', color: CODE_COLOR, letterSpacing: 0.5 },

    // Disclaimer
    disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight },
    disclaimerText: { ...Typography.caption, color: Colors.textTertiary, flex: 1, lineHeight: 18 },

    // Encrypted
    encryptedBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderLight, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    encryptedLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    encryptedText: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1.2 },
    paymentIconBox: { width: 36, height: 28, borderRadius: 6, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },

    // Footer
    footer: { backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight, padding: Spacing.md, gap: Spacing.sm },
    payBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg },
    payBtnDisabled: { opacity: 0.6 },
    payBtnTitle: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
    payBtnSub: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 1, marginTop: 2 },
    termsText: { fontSize: 9, color: Colors.textTertiary, textAlign: 'center', letterSpacing: 0.5, lineHeight: 14 },
});