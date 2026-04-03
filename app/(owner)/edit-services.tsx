import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getMyGarage, updateGarageServicesWithPricing } from '../../utils/services/garageService';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

// ── Catalogues ────────────────────────────────────────────────────────────────
const BIKE_CATALOGUE = [
    'Oil Change', 'Full Service', 'Chain & Sprocket', 'Brake Adjustment',
    'Air Filter Clean', 'Engine Tune-up', 'Carburetor Clean', 'Clutch Repair',
    'Gear Adjustment', 'Spark Plug', 'Wheel Alignment', 'Suspension Check',
    'Battery Check', 'Battery Replacement', 'Headlight Fix', 'Body Work',
    'Coolant Flush', 'Tyre Puncture Fix', 'Nitrogen Fill', 'Foam Wash',
];

const SCOOTY_CATALOGUE = [
    'Belt Change', 'CVT Service', 'Oil Change', 'Full Service',
    'Brake Adjustment', 'Air Filter Clean', 'Spark Plug', 'Battery Check',
    'Battery Replacement', 'Tyre Puncture Fix', 'Nitrogen Fill',
    'Body Work', 'Headlight Fix', 'Suspension Check', 'Wheel Alignment',
    'Foam Wash', 'Coolant Flush', 'Engine Tune-up', 'Fuel Injector Clean',
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'bike' | 'scooty';

type ServiceEntry = {
    enabled: boolean;
    price: string;
};

type ServicesMap = Record<string, ServiceEntry>;

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildMap(
    catalogue: string[],
    enabled: string[],
    prices: Record<string, number>,
): ServicesMap {
    const map: ServicesMap = {};
    catalogue.forEach((name) => {
        map[name] = {
            enabled: enabled.includes(name),
            price: prices?.[name] != null ? String(prices[name]) : '',
        };
    });
    return map;
}

function enabledList(map: ServicesMap): string[] {
    return Object.entries(map)
        .filter(([, v]) => v.enabled)
        .map(([k]) => k);
}

function priceRecord(
    map: ServicesMap,
    completePrice: string,
): Record<string, number> {
    const out: Record<string, number> = {};
    Object.entries(map).forEach(([name, entry]) => {
        if (entry.enabled && entry.price.trim()) {
            out[name] = parseFloat(entry.price) || 0;
        }
    });
    if (completePrice.trim()) {
        out['Complete Servicing'] = parseFloat(completePrice) || 0;
    }
    return out;
}

// ── Service Row ───────────────────────────────────────────────────────────────
function ServiceRow({
    name,
    entry,
    onToggle,
    onPriceChange,
}: {
    name: string;
    entry: ServiceEntry;
    onToggle: () => void;
    onPriceChange: (p: string) => void;
}) {
    return (
        <View style={rowStyles.wrap}>
            <TouchableOpacity
                style={[rowStyles.toggle, entry.enabled && rowStyles.toggleOn]}
                onPress={onToggle}
                activeOpacity={0.8}
            >
                <View style={[rowStyles.toggleThumb, entry.enabled && rowStyles.toggleThumbOn]} />
            </TouchableOpacity>

            <Text style={[rowStyles.name, !entry.enabled && rowStyles.nameDisabled]}>
                {name}
            </Text>

            {entry.enabled ? (
                <View style={rowStyles.priceBox}>
                    <Text style={rowStyles.rupee}>{'₹'}</Text>
                    <TextInput
                        style={rowStyles.priceInput}
                        value={entry.price}
                        onChangeText={onPriceChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={Colors.textTertiary}
                        maxLength={6}
                    />
                </View>
            ) : (
                <View style={rowStyles.priceBoxDisabled}>
                    <Text style={rowStyles.priceDisabledText}>{'—'}</Text>
                </View>
            )}
        </View>
    );
}

const rowStyles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        gap: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    toggle: {
        width: 40, height: 22, borderRadius: 11,
        backgroundColor: Colors.border,
        justifyContent: 'center', paddingHorizontal: 3,
    },
    toggleOn: { backgroundColor: Colors.primary },
    toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', ...Shadow.sm },
    toggleThumbOn: { alignSelf: 'flex-end' },
    name: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
    nameDisabled: { color: Colors.textTertiary },
    priceBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.primaryLight,
        borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.primary,
        paddingHorizontal: Spacing.sm, paddingVertical: 6, gap: 3, minWidth: 88,
    },
    rupee: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
    priceInput: {
        ...Typography.body, color: Colors.textPrimary,
        fontWeight: '700', minWidth: 48, textAlign: 'right', padding: 0,
    },
    priceBoxDisabled: { minWidth: 88, alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, paddingVertical: 6 },
    priceDisabledText: { ...Typography.body, color: Colors.textTertiary },
});

// ── Complete Servicing Card ───────────────────────────────────────────────────
function CompletePricingRow({
    price, onPriceChange, enabledCount, accentColor, accentBg,
}: {
    price: string;
    onPriceChange: (p: string) => void;
    enabledCount: number;
    accentColor: string;
    accentBg: string;
}) {
    return (
        <View style={[completeStyles.card, { borderColor: accentColor + '40', backgroundColor: accentBg }]}>
            <View style={completeStyles.top}>
                <View style={[completeStyles.badge, { backgroundColor: accentColor + '20' }]}>
                    <Ionicons name="star" size={14} color={accentColor} />
                </View>
                <View style={completeStyles.info}>
                    <Text style={[completeStyles.title, { color: accentColor }]}>
                        {'Complete Servicing'}
                    </Text>
                    <Text style={completeStyles.sub}>
                        {'Includes all '}
                        <Text style={{ fontWeight: '700' }}>{String(enabledCount)}</Text>
                        {enabledCount === 1 ? ' enabled service' : ' enabled services'}
                    </Text>
                </View>
                <View style={[completeStyles.priceBox, { borderColor: accentColor, backgroundColor: Colors.surface }]}>
                    <Text style={[completeStyles.rupee, { color: accentColor }]}>{'₹'}</Text>
                    <TextInput
                        style={completeStyles.priceInput}
                        value={price}
                        onChangeText={onPriceChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={Colors.textTertiary}
                        maxLength={6}
                    />
                </View>
            </View>
            <Text style={completeStyles.hint}>
                {'Customers selecting "Complete Servicing" will be charged this price.'}
            </Text>
        </View>
    );
}

const completeStyles = StyleSheet.create({
    card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.xs, marginBottom: Spacing.md },
    top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    badge: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    title: { ...Typography.body, fontWeight: '700' },
    sub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
    priceBox: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.sm, borderWidth: 1.5, paddingHorizontal: Spacing.sm, paddingVertical: 8, minWidth: 90 },
    rupee: { ...Typography.body, fontWeight: '800' },
    priceInput: { ...Typography.body, fontWeight: '700', color: Colors.textPrimary, minWidth: 50, textAlign: 'right', padding: 0 },
    hint: { ...Typography.caption, color: Colors.textTertiary, fontStyle: 'italic' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function EditServicesScreen() {
    const router = useRouter();
    const { toast, showToast, hideToast } = useToast();

    const [tab, setTab] = useState<Tab>('bike');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [garageId, setGarageId] = useState<any>(null);

    const [bikeMap, setBikeMap] = useState<ServicesMap>({});
    const [scootyMap, setScootyMap] = useState<ServicesMap>({});

    const [bikeCompletePrice, setBikeCompletePrice] = useState('');
    const [scootyCompletePrice, setScootyCompletePrice] = useState('');

    useFocusEffect(useCallback(() => { load(); }, []));

    const load = async () => {
        setLoading(true);
        try {
            const g = await getMyGarage();
            setGarageId(g.id);

            const bikePrices = g.service_prices?.bike ?? {};
            const scootyPrices = g.service_prices?.scooty ?? {};

            setBikeMap(buildMap(BIKE_CATALOGUE, g.services?.bike ?? [], bikePrices));
            setScootyMap(buildMap(SCOOTY_CATALOGUE, g.services?.scooty ?? [], scootyPrices));

            setBikeCompletePrice(
                bikePrices['Complete Servicing'] != null
                    ? String(bikePrices['Complete Servicing']) : ''
            );
            setScootyCompletePrice(
                scootyPrices['Complete Servicing'] != null
                    ? String(scootyPrices['Complete Servicing']) : ''
            );
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Failed to load services.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleBike = (name: string) =>
        setBikeMap((p) => ({ ...p, [name]: { ...p[name], enabled: !p[name].enabled } }));
    const toggleScooty = (name: string) =>
        setScootyMap((p) => ({ ...p, [name]: { ...p[name], enabled: !p[name].enabled } }));

    const setBikePrice = (name: string, price: string) =>
        setBikeMap((p) => ({ ...p, [name]: { ...p[name], price } }));
    const setScootyPrice = (name: string, price: string) =>
        setScootyMap((p) => ({ ...p, [name]: { ...p[name], price } }));

    const currentMap = tab === 'bike' ? bikeMap : scootyMap;
    const currentCatalogue = tab === 'bike' ? BIKE_CATALOGUE : SCOOTY_CATALOGUE;
    const allEnabled = currentCatalogue.every((n) => currentMap[n]?.enabled);

    const toggleAll = () => {
        const setter = tab === 'bike' ? setBikeMap : setScootyMap;
        setter((prev) => {
            const updated = { ...prev };
            currentCatalogue.forEach((n) => {
                updated[n] = { ...updated[n], enabled: !allEnabled };
            });
            return updated;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateGarageServicesWithPricing(garageId, {
                bike_services: enabledList(bikeMap),
                scooty_services: enabledList(scootyMap),
                service_prices: {
                    bike: priceRecord(bikeMap, bikeCompletePrice),
                    scooty: priceRecord(scootyMap, scootyCompletePrice),
                },
            });
            const total = enabledList(bikeMap).length + enabledList(scootyMap).length;
            showToast('Saved — ' + String(total) + ' services active.', 'success');
            setTimeout(() => router.back(), 1000);
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Failed to save services.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const bikeEnabled = enabledList(bikeMap).length;
    const scootyEnabled = enabledList(scootyMap).length;
    const tabEnabled = tab === 'bike' ? bikeEnabled : scootyEnabled;
    const accent = tab === 'bike' ? Colors.info : '#6D28D9';
    const accentBg = tab === 'bike' ? Colors.infoLight : '#F5F3FF';

    if (loading) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{'Services & Pricing'}</Text>
                    <Text style={styles.headerSub}>
                        {String(bikeEnabled) + ' bike · ' + String(scootyEnabled) + ' scooty active'}
                    </Text>
                </View>
                <View style={styles.headerRight} />
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {(['bike', 'scooty'] as Tab[]).map((t) => {
                    const isActive = tab === t;
                    const count = t === 'bike' ? bikeEnabled : scootyEnabled;
                    const tabAccent = t === 'bike' ? Colors.info : '#6D28D9';
                    const tabBg = t === 'bike' ? Colors.infoLight : '#F5F3FF';
                    return (
                        <TouchableOpacity
                            key={t}
                            style={[
                                styles.tabItem,
                                isActive && { borderBottomColor: tabAccent, borderBottomWidth: 2 },
                            ]}
                            onPress={() => setTab(t)}
                            activeOpacity={0.75}
                        >
                            <Ionicons
                                name={t === 'bike' ? 'bicycle-outline' : 'speedometer-outline'}
                                size={18}
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

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Select all row */}
                <View style={styles.selectAllRow}>
                    <Text style={styles.selectAllLabel}>
                        {String(tabEnabled) + ' of ' + String(currentCatalogue.length) + ' selected'}
                    </Text>
                    <TouchableOpacity style={styles.selectAllBtn} onPress={toggleAll}>
                        <Text style={styles.selectAllBtnText}>
                            {allEnabled ? 'Deselect All' : 'Select All'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Complete Servicing */}
                <CompletePricingRow
                    price={tab === 'bike' ? bikeCompletePrice : scootyCompletePrice}
                    onPriceChange={tab === 'bike' ? setBikeCompletePrice : setScootyCompletePrice}
                    enabledCount={tabEnabled}
                    accentColor={accent}
                    accentBg={accentBg}
                />

                {/* Individual services */}
                <View style={styles.listCard}>
                    <Text style={styles.listHeader}>{'INDIVIDUAL SERVICES'}</Text>
                    <View style={styles.columnHeader}>
                        <Text style={[styles.columnLabel, styles.colService]}>{'Service'}</Text>
                        <Text style={[styles.columnLabel, styles.colPrice]}>{'Price (₹)'}</Text>
                    </View>
                    {currentCatalogue.map((name) => {
                        const entry = currentMap[name] ?? { enabled: false, price: '' };
                        return (
                            <ServiceRow
                                key={name}
                                name={name}
                                entry={entry}
                                onToggle={() => tab === 'bike' ? toggleBike(name) : toggleScooty(name)}
                                onPriceChange={(p) => tab === 'bike' ? setBikePrice(name, p) : setScootyPrice(name, p)}
                            />
                        );
                    })}
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.footerMeta}>
                    <Ionicons name="information-circle-outline" size={14} color={Colors.textTertiary} />
                    <Text style={styles.footerMetaText}>
                        {'Prices are shown to customers before they book.'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.88}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                            <Text style={styles.saveBtnText}>{'Save Services & Pricing'}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={hideToast}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    backBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },
    headerSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
    headerRight: { width: 36 },
    tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabLabel: { ...Typography.body, color: Colors.textTertiary },
    tabBadge: { borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
    tabBadgeText: { fontSize: 11, fontWeight: '700' },
    content: { padding: Spacing.md, gap: Spacing.sm },
    selectAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
    selectAllLabel: { ...Typography.caption, color: Colors.textTertiary },
    selectAllBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
    selectAllBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
    listCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, ...Shadow.sm },
    listHeader: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
    columnHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, marginBottom: 4 },
    columnLabel: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    colService: { flex: 1, marginLeft: 52 },
    colPrice: { width: 90, textAlign: 'right' },
    footer: { backgroundColor: Colors.surface, padding: Spacing.md, gap: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.borderLight },
    footerMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    footerMetaText: { ...Typography.caption, color: Colors.textTertiary, flex: 1 },
    saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { ...Typography.button, color: '#fff' },
    bottomSpacer: { height: 24 },
});