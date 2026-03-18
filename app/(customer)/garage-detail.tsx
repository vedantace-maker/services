import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getGarageById } from '../../utils/services/garageService';
import { Garage } from '../../types';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

export default function GarageDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [garage, setGarage] = useState<Garage | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast, showToast, hideToast } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getGarageById(id)
            .then(setGarage)
            .catch((e) =>
                showToast(e?.response?.data?.detail ?? 'Failed to load garage.', 'error')
            )
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />;
    if (!garage) return (
        <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <Text style={styles.errorText}>Garage not found.</Text>
        </View>
    );

    const bikeServices = garage.services?.bike ?? [];
    const scootyServices = garage.services?.scooty ?? [];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Garage Details</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Garage Info */}
                <View style={styles.card}>
                    <View style={styles.garageIconRow}>
                        <View style={styles.garageIconBox}>
                            <Ionicons name="storefront" size={28} color={Colors.primary} />
                        </View>
                        <View style={styles.garageInfo}>
                            <Text style={styles.garageName}>{garage.name}</Text>
                            {garage.distanceKm !== undefined && (
                                <View style={styles.distRow}>
                                    <Ionicons name="navigate-outline" size={13} color={Colors.primary} />
                                    <Text style={styles.distText}>{garage.distanceKm} km away</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={16} color={Colors.textTertiary} />
                        <Text style={styles.metaText}>{garage.address}</Text>
                    </View>
                    <View style={[styles.metaRow, { marginTop: Spacing.sm }]}>
                        <Ionicons name="call-outline" size={16} color={Colors.textTertiary} />
                        <Text style={styles.metaText}>{garage.phone}</Text>
                    </View>
                </View>

                {/* Bike Services */}
                {bikeServices.length > 0 && (
                    <View style={styles.card}>
                        <View style={styles.serviceHeader}>
                            <View style={[styles.serviceHeaderIcon, { backgroundColor: Colors.infoLight }]}>
                                <Ionicons name="bicycle-outline" size={18} color={Colors.info} />
                            </View>
                            <View>
                                <Text style={styles.serviceHeaderTitle}>Bike Services</Text>
                                <Text style={styles.serviceHeaderSub}>
                                    {bikeServices.length} services available
                                </Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.chipsWrap}>
                            {bikeServices.map((s, i) => (
                                <View key={i} style={[styles.chip, { backgroundColor: Colors.infoLight, borderColor: '#BFDBFE' }]}>
                                    <Text style={[styles.chipText, { color: Colors.info }]}>{s}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Scooty Services */}
                {scootyServices.length > 0 && (
                    <View style={styles.card}>
                        <View style={styles.serviceHeader}>
                            <View style={[styles.serviceHeaderIcon, { backgroundColor: '#F5F3FF' }]}>
                                <Ionicons name="speedometer-outline" size={18} color="#6D28D9" />
                            </View>
                            <View>
                                <Text style={styles.serviceHeaderTitle}>Scooty Services</Text>
                                <Text style={styles.serviceHeaderSub}>
                                    {scootyServices.length} services available
                                </Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.chipsWrap}>
                            {scootyServices.map((s, i) => (
                                <View key={i} style={[styles.chip, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                                    <Text style={[styles.chipText, { color: '#6D28D9' }]}>{s}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

            </ScrollView>

            {/* Book button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() =>
                        router.push(`/(customer)/book-slot?id=${garage.id}` as any)
                    }
                    activeOpacity={0.9}
                >
                    <Text style={styles.bookBtnText}>Book a Time Slot</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={hideToast}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    errorText: { ...Typography.h3, color: Colors.error },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 56, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: Radius.sm,
        backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },
    content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },
    card: {
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
    },
    garageIconRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
    garageIconBox: {
        width: 56, height: 56, borderRadius: Radius.md,
        backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
    },
    garageInfo: { flex: 1 },
    garageName: { ...Typography.h2, color: Colors.textPrimary },
    distRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    distText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.md },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    metaText: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
    serviceHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
    serviceHeaderIcon: { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    serviceHeaderTitle: { ...Typography.h3, color: Colors.textPrimary },
    serviceHeaderSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 6 },
    chipText: { ...Typography.caption, fontWeight: '600' },
    footer: {
        padding: Spacing.md, backgroundColor: Colors.surface,
        borderTopWidth: 1, borderTopColor: Colors.borderLight,
    },
    bookBtn: {
        backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    },
    bookBtnText: { ...Typography.button, color: '#fff' },
});
