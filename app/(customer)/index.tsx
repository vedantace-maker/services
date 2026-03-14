import React, { useState, useCallback, useEffect } from 'react';
import {
    View, FlatList, Text, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { getAllGarages } from '../../utils/storage';
import { getDistanceKm } from '../../utils/distance';
import { Garage } from '../../types';
import GarageCard from '../../components/GarageCard';
// Paste temporarily in any useEffect to reset welcome for your test user


//remove all welcome keys
// import AsyncStorage from '@react-native-async-storage/async-storage';


export default function HomeScreen() {

    
    // clear all welcome keys
    // useEffect(() => {
    //     AsyncStorage.getAllKeys().then((keys) => {
    //         const welcomeKeys = keys.filter((k) => k.startsWith('@motobee_welcome_'));
    //         AsyncStorage.multiRemove(welcomeKeys);
    //     });
    // }, []);

    const [garages, setGarages] = useState<Garage[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            loadNearbyGarages();
        }, [])
    );

    const loadNearbyGarages = async () => {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        const all = await getAllGarages();

        if (status !== 'granted') {
            Alert.alert('Location Denied', 'Showing all garages without distance sorting.');
            setGarages(all);
            setLoading(false);
            return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;

        const withDistance = all.map((g) => ({
            ...g,
            distanceKm: getDistanceKm(latitude, longitude, g.latitude, g.longitude),
        }));
        withDistance.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
        setGarages(withDistance);
        setLoading(false);
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#FF6B35" />;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>🛵 Garages Near You</Text>
            <FlatList
                data={garages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <GarageCard
                        garage={item}
                        onPress={() => router.push(`/(customer)/garage-detail?id=${item.id}`)}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No garages found nearby.</Text>
                        <Text style={styles.emptyHint}>Ask a garage owner to register on this app.</Text>
                    </View>
                }
                onRefresh={loadNearbyGarages}
                refreshing={loading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9', padding: 16 },
    header: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 16 },
    emptyBox: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#888', fontSize: 16 },
    emptyHint: { color: '#bbb', fontSize: 13, marginTop: 6 },
});
