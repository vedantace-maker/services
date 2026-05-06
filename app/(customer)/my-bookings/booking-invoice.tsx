import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, StatusBar, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Booking } from '../../../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

// ── Helpers ────────────────────────────────────────────────────────────────────
const toNum = (val: any) => parseFloat(String(val ?? 0)) || 0;

function formatDisplayDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
}

function formatDisplayTime(time: string): string {
    if (!time) return '—';
    const [hStr, mStr] = time.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ?? '00';
    if (h === 0) return `12:${m} AM`;
    if (h < 12) return `${h}:${m} AM`;
    if (h === 12) return `12:${m} PM`;
    return `${h - 12}:${m} PM`;
}

// ── Bill Row ───────────────────────────────────────────────────────────────────
function BillRow({ label, value, bold = false, highlight = false }: {
    label: string; value: string; bold?: boolean; highlight?: boolean;
}) {
    return (
        <View style={[s.billRow, highlight && s.billRowHighlight]}>
            <Text style={[s.billLabel, bold && s.billLabelBold]}>{label}</Text>
            <Text style={[s.billValue, bold && s.billValueBold, highlight && { color: Colors.primary }]}>
                {value}
            </Text>
        </View>
    );
}

// ── Invoice HTML ───────────────────────────────────────────────────────────────
function generateInvoiceHTML(
    booking: Booking,
    serviceItems: { name: string; price: number | null }[],
): string {
    const subtotal = toNum(booking.services_subtotal);
    const platformFee = toNum(booking.platform_fee);
    const delivery = toNum(booking.delivery_charge);
    const gst = toNum(booking.gst);
    const cess = toNum(booking.cess);
    const total = toNum(booking.grand_total) || (subtotal + platformFee + delivery + gst + cess);

    const statusColor = booking.status === 'completed' ? '#065f46' : '#1e40af';
    const statusBg = booking.status === 'completed' ? '#d1fae5' : '#eff6ff';

    const serviceRows = serviceItems.map((svc, i) => `
        <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">
                ${i + 1}. ${svc.name}
            </td>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px;color:#111827;font-weight:600;">
                ${svc.price != null
            ? `₹${toNum(svc.price).toFixed(2)}`
            : '<span style="color:#9ca3af;">—</span>'}
            </td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,Helvetica,sans-serif; color:#1f2937; background:#fff; padding:40px; font-size:14px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:24px; border-bottom:3px solid #01696f; margin-bottom:28px; }
    .brand { font-size:30px; font-weight:900; color:#01696f; letter-spacing:-0.5px; }
    .brand span { color:#f59e0b; }
    .brand-sub { font-size:12px; color:#9ca3af; margin-top:3px; }
    .inv-right { text-align:right; }
    .inv-label { font-size:11px; color:#9ca3af; text-transform:uppercase; letter-spacing:1.5px; font-weight:700; }
    .inv-num { font-size:24px; font-weight:900; color:#111827; margin-top:4px; }
    .inv-date { font-size:12px; color:#6b7280; margin-top:4px; }
    .status-chip { display:inline-block; padding:4px 14px; border-radius:20px; font-size:11px; font-weight:800;
      text-transform:uppercase; letter-spacing:0.8px; margin-top:8px;
      background:${statusBg}; color:${statusColor}; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; }
    .info-box { background:#f9fafb; border-radius:10px; padding:16px; }
    .info-box h4 { font-size:10px; color:#9ca3af; text-transform:uppercase; letter-spacing:1.2px; font-weight:800; margin-bottom:10px; }
    .info-box p { font-size:13px; color:#374151; line-height:1.8; }
    .info-box strong { color:#111827; font-size:14px; font-weight:700; }
    table { width:100%; border-collapse:collapse; margin-bottom:20px; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb; }
    thead tr { background:#f3f4f6; }
    thead th { padding:12px 14px; text-align:left; font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; }
    thead th:last-child { text-align:right; }
    .totals-wrap { margin-left:auto; width:300px; background:#f9fafb; border-radius:10px; padding:16px; border:1px solid #e5e7eb; }
    .total-row { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid #f3f4f6; font-size:13px; color:#6b7280; }
    .total-row:last-child { border-bottom:none; }
    .total-row.grand { border-top:2px solid #01696f; padding-top:12px; margin-top:6px; font-size:17px; font-weight:900; color:#01696f; }
    .footer { margin-top:40px; padding-top:20px; border-top:1px solid #e5e7eb; text-align:center; font-size:12px; color:#9ca3af; line-height:1.8; }
    .footer strong { color:#01696f; }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="brand">Moto<span>Bee</span></div>
      <div class="brand-sub">Vehicle Service Platform</div>
    </div>
    <div class="inv-right">
      <div class="inv-label">Invoice</div>
      <div class="inv-num">#INV-${String(booking.id).padStart(6, '0')}</div>
      <div class="inv-date">Issued: ${formatDisplayDate(new Date().toISOString())}</div>
      <div><span class="status-chip">${booking.status.replace('_', ' ')}</span></div>
    </div>
  </div>

  <div class="grid">
    <div class="info-box">
      <h4>Garage Details</h4>
      <p>
        <strong>${booking.garage_name}</strong><br/>
        ${booking.garage_address || ''}<br/>
        ${booking.garage_phone ? '📞 ' + booking.garage_phone : ''}
      </p>
    </div>
    <div class="info-box">
      <h4>Booking Info</h4>
      <p>
        <strong>Booking ID:</strong> #${booking.id}<br/>
        <strong>Date:</strong> ${formatDisplayDate(booking.date)}<br/>
        <strong>Time:</strong> ${formatDisplayTime(booking.time)}<br/>
        <strong>Vehicle:</strong> ${booking.vehicle_type === 'bike' ? 'Bike' : 'Scooty'} — ${booking.bike_details}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Service Description</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${serviceRows}</tbody>
  </table>

  <div class="totals-wrap">
    <div class="total-row"><span>Services Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
    <div class="total-row"><span>Platform Fee</span><span>₹${platformFee.toFixed(2)}</span></div>
    ${delivery > 0 ? `<div class="total-row"><span>Pickup / Delivery</span><span>₹${delivery.toFixed(2)}</span></div>` : ''}
    ${gst > 0 ? `<div class="total-row"><span>GST (18%)</span><span>₹${gst.toFixed(2)}</span></div>` : ''}
    ${cess > 0 ? `<div class="total-row"><span>Cess</span><span>₹${cess.toFixed(2)}</span></div>` : ''}
    <div class="total-row grand"><span>Grand Total</span><span>₹${total.toFixed(2)}</span></div>
  </div>

  <div class="footer">
    <p>Thank you for choosing <strong>MotoBee</strong> — Your trusted vehicle service partner.</p>
    <p>For support: support@motobee.in | Booking ID: #${booking.id}</p>
  </div>

</body>
</html>`;
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function BookingInvoiceScreen() {
    const router = useRouter();
    const { booking: raw } = useLocalSearchParams<{ booking: string }>();
    const booking: Booking = JSON.parse(raw ?? '{}');
    const [downloading, setDownloading] = useState(false);

    // Billing amounts
    const subtotal = toNum(booking.services_subtotal);
    const platformFee = toNum(booking.platform_fee);
    const delivery = toNum(booking.delivery_charge);
    const gst = toNum(booking.gst);
    const cess = toNum(booking.cess);
    const total = toNum(booking.grand_total) || (subtotal + platformFee + delivery + gst + cess);

    // ✅ service_items now comes from backend with prices
    // Falls back gracefully to names-only for older bookings
    const serviceItems: { name: string; price: number | null }[] =
        booking.service_items && booking.service_items.length > 0
            ? booking.service_items.map((s) => ({
                name: s.name,
                price: s.price != null ? toNum(s.price) : null,
            }))
            : (booking.selected_services ?? '')
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
                .map((name: string) => ({ name, price: null }));

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const html = generateInvoiceHTML(booking, serviceItems);
            const { uri } = await Print.printToFileAsync({ html, base64: false });
            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                Alert.alert('Not Supported', 'Sharing is not available on this device.');
                return;
            }
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `MotoBee_Invoice_${String(booking.id).padStart(6, '0')}.pdf`,
                UTI: 'com.adobe.pdf',
            });
        } catch (e: any) {
            console.error('Invoice error:', e);
            Alert.alert('Failed', 'Could not generate invoice. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

            <View style={s.container}>

                {/* ── Top Header ─────────────────────────────────────────── */}
                <View style={s.header}>
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/(customer)/my-bookings');
                            }
                        }}
                    >
                        <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <View>
                        <Text style={s.headerTitle}>Invoice</Text>
                        <Text style={s.headerSub}>#INV-{String(booking.id).padStart(6, '0')}</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                    {/* ── Brand Card ──────────────────────────────────────── */}
                    <View style={s.invoiceHeader}>
                        <View>
                            <Text style={s.brand}>
                                Moto<Text style={{ color: '#F59E0B' }}>Bee</Text>
                            </Text>
                            <Text style={s.brandSub}>Vehicle Service Platform</Text>
                        </View>
                        <View style={s.invoiceTag}>
                            <Text style={s.invoiceTagText}>INVOICE</Text>
                            <Text style={s.invoiceNum}>#INV-{String(booking.id).padStart(6, '0')}</Text>
                            <Text style={s.invoiceDate}>{formatDisplayDate(new Date().toISOString())}</Text>
                        </View>
                    </View>

                    {/* ── Info Grid ───────────────────────────────────────── */}
                    <View style={s.infoGrid}>
                        <View style={s.infoBox}>
                            <Text style={s.infoBoxTitle}>GARAGE</Text>
                            <Text style={s.infoBoxName}>{booking.garage_name}</Text>
                            {!!booking.garage_address && (
                                <Text style={s.infoBoxMeta}>{booking.garage_address}</Text>
                            )}
                            {!!booking.garage_phone && (
                                <Text style={s.infoBoxMeta}>📞 {booking.garage_phone}</Text>
                            )}
                        </View>
                        <View style={[s.infoBox, { borderLeftWidth: 1, borderLeftColor: Colors.borderLight }]}>
                            <Text style={s.infoBoxTitle}>BOOKING</Text>
                            <Text style={s.infoBoxMeta}>🗓 {formatDisplayDate(booking.date)}</Text>
                            <Text style={s.infoBoxMeta}>⏱ {formatDisplayTime(booking.time)}</Text>
                            <Text style={s.infoBoxMeta}>
                                {booking.vehicle_type === 'bike' ? '🚲' : '🛵'} {booking.bike_details}
                            </Text>
                        </View>
                    </View>

                    {/* ── Services with Prices ────────────────────────────── */}
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Services</Text>
                        <View style={s.servicesCard}>
                            <View style={s.tableHeader}>
                                <Text style={s.tableHeadText}>Description</Text>
                                <Text style={[s.tableHeadText, { textAlign: 'right' }]}>Amount</Text>
                            </View>

                            {serviceItems.map((svc, i) => (
                                <View
                                    key={i}
                                    style={[
                                        s.serviceRow,
                                        i < serviceItems.length - 1 && s.serviceRowBorder,
                                    ]}
                                >
                                    <View style={s.serviceRowLeft}>
                                        <View style={s.serviceDot} />
                                        <Text style={s.serviceText}>{svc.name}</Text>
                                    </View>
                                    <Text style={[
                                        s.serviceAmount,
                                        svc.price != null && { color: Colors.textPrimary, fontWeight: '700' },
                                    ]}>
                                        {svc.price != null
                                            ? `₹${svc.price.toFixed(2)}`
                                            : '—'}
                                    </Text>
                                </View>
                            ))}

                            {/* Subtotal bar at bottom of services */}
                            <View style={s.servicesTotalRow}>
                                <Text style={s.servicesTotalLabel}>Services Subtotal</Text>
                                <Text style={s.servicesTotalValue}>₹{subtotal.toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Billing Summary ─────────────────────────────────── */}
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Billing Summary</Text>
                        <View style={s.billCard}>
                            <BillRow label="Services Subtotal" value={`₹${subtotal.toFixed(2)}`} />
                            <BillRow label="Platform Fee" value={`₹${platformFee.toFixed(2)}`} />
                            {delivery > 0 && (
                                <BillRow label="Pickup / Delivery" value={`₹${delivery.toFixed(2)}`} />
                            )}
                            {gst > 0 && (
                                <BillRow label="GST (18%)" value={`₹${gst.toFixed(2)}`} />
                            )}
                            {cess > 0 && (
                                <BillRow label="Cess" value={`₹${cess.toFixed(2)}`} />
                            )}
                            <View style={s.totalDivider} />
                            <BillRow
                                label="Grand Total"
                                value={`₹${total.toFixed(2)}`}
                                bold
                                highlight
                            />
                        </View>
                    </View>

                    {/* ── Note ────────────────────────────────────────────── */}
                    <TouchableOpacity
                        style={s.noteCard}
                        onPress={() => Linking.openURL('mailto:support@motobee.in')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="information-circle-outline" size={15} color={Colors.textTertiary} />
                        <Text style={s.noteText}>
                            This invoice is generated by MotoBee. For disputes, contact{' '}
                            <Text style={{ color: Colors.primary }}>support@motobee.in</Text>
                        </Text>
                    </TouchableOpacity>

                    {/* ── Download Button ──────────────────────────────────── */}
                    <TouchableOpacity
                        style={[s.downloadBtn, downloading && { opacity: 0.7 }]}
                        onPress={handleDownload}
                        disabled={downloading}
                        activeOpacity={0.85}
                    >
                        {downloading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="download-outline" size={20} color="#fff" />
                                <Text style={s.downloadBtnText}>Download Invoice PDF</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 52, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: Radius.md,
        backgroundColor: Colors.surfaceAlt,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary, textAlign: 'center' },
    headerSub: { ...Typography.caption, color: Colors.textTertiary, textAlign: 'center' },

    scroll: { padding: Spacing.md, gap: Spacing.md },

    invoiceHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        backgroundColor: Colors.surface, borderRadius: Radius.xl,
        padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
        borderLeftWidth: 4, borderLeftColor: Colors.primary,
    },
    brand: { fontSize: 22, fontWeight: '900', color: Colors.primary, letterSpacing: -0.5 },
    brandSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
    invoiceTag: { alignItems: 'flex-end' },
    invoiceTagText: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 1.5, textTransform: 'uppercase' },
    invoiceNum: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
    invoiceDate: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },

    infoGrid: {
        flexDirection: 'row', backgroundColor: Colors.surface,
        borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    },
    infoBox: { flex: 1, padding: Spacing.md, gap: 3 },
    infoBoxTitle: { fontSize: 9, fontWeight: '800', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    infoBoxName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
    infoBoxMeta: { fontSize: 11, color: Colors.textSecondary, lineHeight: 17 },

    section: { gap: Spacing.xs },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 4 },

    servicesCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md, backgroundColor: Colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    tableHeadText: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
    serviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 12 },
    serviceRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    serviceRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
    serviceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
    serviceText: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
    serviceAmount: { fontSize: 13, color: Colors.textTertiary, fontWeight: '500' },
    servicesTotalRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.md, paddingVertical: 10,
        backgroundColor: Colors.primary + '12',
        borderTopWidth: 1, borderTopColor: Colors.primary + '33',
    },
    servicesTotalLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary },
    servicesTotalValue: { fontSize: 14, fontWeight: '800', color: Colors.primary },

    billCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 2 },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
    billRowHighlight: { paddingVertical: 10 },
    billLabel: { ...Typography.body, color: Colors.textSecondary },
    billLabelBold: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
    billValue: { ...Typography.body, color: Colors.textSecondary, fontWeight: '600' },
    billValueBold: { fontWeight: '800', fontSize: 16 },
    totalDivider: { height: 1, backgroundColor: Colors.primary + '44', marginVertical: Spacing.xs },

    noteCard: {
        flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start',
        backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg,
        padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
    },
    noteText: { ...Typography.caption, color: Colors.textTertiary, flex: 1, lineHeight: 18 },

    downloadBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        backgroundColor: Colors.primary, paddingVertical: Spacing.md + 2,
        borderRadius: Radius.xl, ...Shadow.md,
    },
    downloadBtnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
});