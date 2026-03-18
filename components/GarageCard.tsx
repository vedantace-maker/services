import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Garage } from '../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';

interface Props { garage: Garage; onPress: () => void; }

export default function GarageCard({ garage, onPress }: Props) {
    const bikeCount = garage.services?.bike?.length ?? 0;
    const scootyCount = garage.services?.scooty?.length ?? 0;
    const totalServices = bikeCount + scootyCount;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>

            {/* Top row */}
            <View style={styles.topRow}>
                <View style={styles.iconBox}>
                    <Ionicons name="storefront-outline" size={22} color={Colors.primary} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{garage.name}</Text>
                    <View style={styles.addressRow}>
                        <Ionicons name="location-outline" size={13} color={Colors.textTertiary} />
                        <Text style={styles.address} numberOfLines={1}>{garage.address}</Text>
                    </View>
                </View>
                {garage.distanceKm !== undefined ? (
                    <View style={styles.distBadge}>
                        <Text style={styles.distText}>{garage.distanceKm} km</Text>
                    </View>
                ) : null}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Bottom row */}
            <View style={styles.bottomRow}>
                <View style={styles.serviceBadge}>
                    <Ionicons name="bicycle-outline" size={13} color={Colors.info} />
                    <Text style={styles.serviceBadgeText}>{bikeCount} bike</Text>
                </View>
                <View style={[styles.serviceBadge, { backgroundColor: '#F5F3FF' }]}>
                    <Ionicons name="speedometer-outline" size={13} color="#6D28D9" />
                    <Text style={[styles.serviceBadgeText, { color: '#6D28D9' }]}>{scootyCount} scooty</Text>
                </View>
                <View style={styles.flex1} />
                <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={13} color={Colors.textTertiary} />
                    <Text style={styles.phone}>{garage.phone}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </View>

        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
        ...Shadow.sm,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
    iconBox: {
        width: 44, height: 44, borderRadius: Radius.md,
        backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
    },
    info: { flex: 1 },
    name: { ...Typography.h3, color: Colors.textPrimary },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
    address: { ...Typography.caption, color: Colors.textTertiary, flex: 1 },
    distBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
    distText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.md },
    bottomRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
    serviceBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.infoLight, paddingHorizontal: Spacing.sm,
        paddingVertical: 4, borderRadius: Radius.full,
    },
    serviceBadgeText: { ...Typography.caption, color: Colors.info, fontWeight: '600' },
    flex1: { flex: 1 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    phone: { ...Typography.caption, color: Colors.textTertiary },
});
