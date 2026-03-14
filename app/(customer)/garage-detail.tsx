import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getGarageById } from '../../utils/storage';
import { Garage } from '../../types';

export default function GarageDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [garage, setGarage] = useState<Garage | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (id) getGarageById(id).then(setGarage);
    }, [id]);

    if (!garage) return <ActivityIndicator style={{ flex: 1 }} color="#FF6B35" />;

    const bikeServices = garage.services?.bike ?? [];
    const scootyServices = garage.services?.scooty ?? [];

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.name}>{garage.name}</Text>
            <Text style={styles.address}>📍 {garage.address}</Text>
            {garage.distanceKm !== undefined && (
                <Text style={styles.distance}>📏 {garage.distanceKm} km away</Text>
            )}
            <Text style={styles.phone}>📞 {garage.phone}</Text>

            {/* Bike Services */}
            {bikeServices.length > 0 && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🏍️ Bike Services</Text>
                        <Text style={styles.sectionSubtitle}>(with gear)</Text>
                    </View>
                    <View style={styles.chipsWrap}>
                        {bikeServices.map((s, i) => (
                            <View key={i} style={styles.bikeChip}>
                                <Text style={styles.bikeChipText}>✅ {s}</Text>
                            </View>
                        ))}
                    </View>
                </>
            )}

            {/* Scooty Services */}
            {scootyServices.length > 0 && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🛵 Scooty Services</Text>
                        <Text style={styles.sectionSubtitle}>(without gear)</Text>
                    </View>
                    <View style={styles.chipsWrap}>
                        {scootyServices.map((s, i) => (
                            <View key={i} style={styles.scootyChip}>
                                <Text style={styles.scootyChipText}>✅ {s}</Text>
                            </View>
                        ))}
                    </View>
                </>
            )}

            <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => router.push(`/(customer)/book-slot?id=${garage.id}`)}
            >
                <Text style={styles.bookBtnText}>Book a Time Slot →</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    name: { fontSize: 26, fontWeight: 'bold', color: '#222' },
    address: { color: '#666', marginTop: 8, fontSize: 15 },
    distance: { color: '#FF6B35', fontWeight: '600', marginTop: 4 },
    phone: { color: '#444', marginTop: 4, fontSize: 15 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, marginBottom: 10 },
    sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#222' },
    sectionSubtitle: { fontSize: 13, color: '#aaa' },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    bikeChip: {
        backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
    },
    bikeChipText: { color: '#2563EB', fontSize: 13, fontWeight: '500' },
    scootyChip: {
        backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
    },
    scootyChipText: { color: '#7C3AED', fontSize: 13, fontWeight: '500' },
    bookBtn: {
        backgroundColor: '#FF6B35', padding: 16, borderRadius: 12,
        alignItems: 'center', marginTop: 32, marginBottom: 40
    },
    bookBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
