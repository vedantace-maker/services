import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Garage } from '../types';

interface Props { garage: Garage; onPress: () => void; }

export default function GarageCard({ garage, onPress }: Props) {
    const bikeCount = garage.services?.bike?.length ?? 0;
    const scootyCount = garage.services?.scooty?.length ?? 0;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.row}>
                <Text style={styles.name}>{garage.name}</Text>
                {garage.distanceKm !== undefined && (
                    <View style={styles.distBadge}>
                        <Text style={styles.distText}>{garage.distanceKm} km</Text>
                    </View>
                )}
            </View>

            <Text style={styles.address}>📍 {garage.address}</Text>

            <View style={styles.categoryRow}>
                {bikeCount > 0 && (
                    <View style={styles.catBadge}>
                        <Text style={styles.catBikeText}>🏍️ {bikeCount} Bike</Text>
                    </View>
                )}
                {scootyCount > 0 && (
                    <View style={[styles.catBadge, styles.catScootyBadge]}>
                        <Text style={styles.catScootyText}>🛵 {scootyCount} Scooty</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16,
        marginBottom: 12, elevation: 3,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 17, fontWeight: 'bold', color: '#222', flex: 1 },
    distBadge: { backgroundColor: '#FFF3EF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    distText: { color: '#FF6B35', fontWeight: '600', fontSize: 13 },
    address: { color: '#666', marginTop: 6, fontSize: 13 },
    categoryRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    catBadge: {
        backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20
    },
    catBikeText: { color: '#2563EB', fontSize: 12, fontWeight: '600' },
    catScootyBadge: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
    catScootyText: { color: '#7C3AED', fontSize: 12, fontWeight: '600' },
});
