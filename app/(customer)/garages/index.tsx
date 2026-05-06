import React, { useState, useCallback } from 'react';
import {
    View, FlatList, Text, StyleSheet,
    ActivityIndicator, TouchableOpacity, TextInput
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getAllGarages } from '../../../utils/services/garageService';
import { getDistanceKm } from '../../../utils/distance';
import { Garage } from '../../../types';
import GarageCard from '../../../components/GarageCard';
import Toast from '../../../components/Toast';
import { useToast } from '../../../hooks/useToast';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

export default function NearbyGaragesScreen() {
    const [garages, setGarages] = useState<Garage[]>([]);
    const [filtered, setFiltered] = useState<Garage[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { toast, showToast, hideToast } = useToast();
    const router = useRouter();

    useFocusEffect(useCallback(() => { load(); }, []));

    const load = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            const all = await getAllGarages();

            if (status !== 'granted') {
                setGarages(all);
                setFiltered(all);
                setLoading(false);
                return;
            }

            const loc = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = loc.coords;

            const withDist = all
                .map((g) => ({
                    ...g,
                    distanceKm: g.latitude != null && g.longitude != null
                        ? getDistanceKm(latitude, longitude, g.latitude, g.longitude)
                        : undefined,
                }))
                .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));

            setGarages(withDist);
            setFiltered(withDist);
        } catch (e: any) {
            showToast(e?.response?.data?.detail ?? 'Failed to load garages.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearch(text);
        if (!text.trim()) { setFiltered(garages); return; }
        setFiltered(
            garages.filter((g) =>
                g.name.toLowerCase().includes(text.toLowerCase()) ||
                g.address.toLowerCase().includes(text.toLowerCase())
            )
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Nearby Garages</Text>
                <Text style={styles.subtitle}>
                    {filtered.length} garage{filtered.length !== 1 ? 's' : ''} found
                </Text>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color={Colors.textTertiary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or area..."
                    placeholderTextColor={Colors.textTertiary}
                    value={search}
                    onChangeText={handleSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* List */}
            <FlatList
                data={filtered}
                keyExtractor={(g) => g.id}
                renderItem={({ item }) => (
                    <GarageCard
                        garage={item}
                        onPress={() =>
                            router.push(`/(customer)/garages/garage-detail?id=${item.id}` as any)
                        }
                    />
                )}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator
                            size="large"
                            color={Colors.primary}
                            style={{ marginTop: 60 }}
                        />
                    ) : (
                        <View style={styles.empty}>
                            <Ionicons name="storefront-outline" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>No garages found</Text>
                            <Text style={styles.emptyDesc}>
                                Try a different search or check back later.
                            </Text>
                        </View>
                    )
                }
                onRefresh={load}
                refreshing={loading}
            />

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
    header: {
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.md,
        paddingTop: 56, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    title: { ...Typography.h1, color: Colors.textPrimary },
    subtitle: { ...Typography.caption, color: Colors.textTertiary, marginTop: 4 },
    searchWrap: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.surface, margin: Spacing.md,
        padding: Spacing.md, borderRadius: Radius.lg,
        borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
    },
    searchInput: { ...Typography.bodyLg, flex: 1, color: Colors.textPrimary },
    list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
    empty: { alignItems: 'center', marginTop: 60, gap: Spacing.sm },
    emptyTitle: { ...Typography.h3, color: Colors.textSecondary },
    emptyDesc: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },
});
