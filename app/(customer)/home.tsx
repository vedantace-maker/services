import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Dimensions, FlatList, ActivityIndicator,
    Modal, Animated, Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { getMyVehicles } from '../../utils/services/vehicleService';

const { width } = Dimensions.get('window');

const OFFER_SLIDES = [
    { id: '1', label: 'LIMITED OFFER', title: '20% Off\nFull Service', desc: 'Valid on all servicing this month', bg: Colors.primary },
    { id: '2', label: 'FREE SERVICE', title: 'Free\nOil Check', desc: 'With every booking this week', bg: '#1D4ED8' },
    { id: '3', label: 'BEST VALUE', title: 'Tyre Checkup\n₹99', desc: 'Full inspection & nitrogen fill', bg: '#6D28D9' },
    { id: '4', label: 'WARRANTY', title: 'Battery\nReplacement', desc: '1 year warranty on all installs', bg: '#065F46' },
];

const QUICK_SERVICES = [
    { id: '1', label: 'Battery', icon: 'battery-charging-outline' as const, color: Colors.success, bg: Colors.successLight },
    { id: '2', label: 'Brakes', icon: 'disc-outline' as const, color: Colors.error, bg: Colors.errorLight },
    { id: '3', label: 'Lights', icon: 'bulb-outline' as const, color: Colors.warning, bg: Colors.warningLight },
    { id: '4', label: 'Clutch', icon: 'settings-outline' as const, color: '#6D28D9', bg: '#F5F3FF' },
    { id: '5', label: 'Tyres', icon: 'radio-button-on-outline' as const, color: Colors.info, bg: Colors.infoLight },
    { id: '6', label: 'Spare Parts', icon: 'construct-outline' as const, color: Colors.primary, bg: Colors.primaryLight },
];

const ALL_SERVICES = [
    'Oil Change', 'Full Service', 'Tyre Puncture Fix', 'Chain & Sprocket',
    'Brake Adjustment', 'Air Filter Clean', 'Battery Check', 'Battery Replacement',
    'Clutch Repair', 'Gear Adjustment', 'Engine Tune-up', 'Belt Change',
    'CVT Service', 'Body Work', 'Headlight Fix', 'Wheel Alignment',
    'Suspension Check', 'Spark Plug', 'Foam Wash', 'Nitrogen Fill',
];

// ─── Offer Slider ─────────────────────────────────────────────────────────────
function OfferSlider() {
    const ref = useRef<FlatList>(null);
    const [active, setActive] = useState<number>(0);

    useEffect(() => {
        const t = setInterval(() => {
            const next = (active + 1) % OFFER_SLIDES.length;
            ref.current?.scrollToIndex({ index: next, animated: true });
            setActive(next);
        }, 3500);
        return () => clearInterval(t);
    }, [active]);

    return (
        <View>
            <FlatList
                ref={ref}
                data={OFFER_SLIDES}
                horizontal pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(i) => i.id}
                onMomentumScrollEnd={(e) =>
                    setActive(Math.round(e.nativeEvent.contentOffset.x / (width - Spacing.md * 2)))
                }
                renderItem={({ item }) => (
                    <View style={[oStyles.slide, { backgroundColor: item.bg, width: width - Spacing.md * 2 }]}>
                        <View style={oStyles.tag}>
                            <Text style={oStyles.tagText}>{item.label}</Text>
                        </View>
                        <Text style={oStyles.title}>{item.title}</Text>
                        <Text style={oStyles.desc}>{item.desc}</Text>
                        <TouchableOpacity style={oStyles.cta}>
                            <Text style={oStyles.ctaText}>Book Now</Text>
                            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                )}
            />
            <View style={oStyles.dots}>
                {OFFER_SLIDES.map((_, i) => (
                    <View
                        key={i}
                        style={[oStyles.dot, { width: i === active ? 20 : 6, opacity: i === active ? 1 : 0.3 }]}
                    />
                ))}
            </View>
        </View>
    );
}

const oStyles = StyleSheet.create({
    slide: { borderRadius: Radius.lg, padding: Spacing.lg, minHeight: 148 },
    tag: {
        alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: Spacing.sm, paddingVertical: 3,
        borderRadius: Radius.full, marginBottom: Spacing.sm,
    },
    tagText: { ...Typography.overline, color: '#fff', textTransform: 'uppercase' },
    title: { ...Typography.h1, color: '#fff', marginBottom: Spacing.xs },
    desc: { ...Typography.body, color: 'rgba(255,255,255,0.8)', marginBottom: Spacing.md },
    cta: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
        backgroundColor: '#fff', alignSelf: 'flex-start',
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
    },
    ctaText: { ...Typography.buttonSm, color: Colors.primary },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.md },
    dot: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
    const user = useAuthStore((s) => s.user);
    const router = useRouter();

    const [locationText, setLocationText] = useState('Fetching location...');
    const [locLoading, setLocLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showVehiclePrompt, setShowVehiclePrompt] = useState(false);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const ITEM_W = (width - Spacing.md * 2 - Spacing.sm * 2) / 3;

    // ── Location ──────────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationText('Location unavailable');
                setLocLoading(false);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            const [place] = await Location.reverseGeocodeAsync(loc.coords);
            if (place) {
                const parts = [place.street, place.district ?? place.subregion, place.city].filter(Boolean);
                setLocationText(parts.join(', '));
            } else {
                setLocationText('Location found');
            }
            setLocLoading(false);
        })();
    }, []);

    // ── Vehicle prompt check ──────────────────────────────────────────────────
    useEffect(() => { checkVehicles(); }, []);

    const checkVehicles = async () => {
        try {
            const vehicles = await getMyVehicles();
            if (vehicles.length === 0) {
                setTimeout(() => {
                    setShowVehiclePrompt(true);
                    slideAnim.setValue(0);
                    Animated.spring(slideAnim, {
                        toValue: 1, useNativeDriver: true, tension: 65, friction: 11,
                    }).start();
                }, 700);
            }
        } catch {
            // Non-critical — skip silently
        }
    };

    const closeVehiclePrompt = (goToVehicles = false) => {
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true })
            .start(() => {
                setShowVehiclePrompt(false);
                if (goToVehicles) router.push('/(customer)/my-vehicles' as any);
            });
    };

    // ── Search ────────────────────────────────────────────────────────────────
    const handleSearch = (text: string) => {
        setSearchQuery(text);
        setSuggestions(
            text.trim()
                ? ALL_SERVICES.filter((s) => s.toLowerCase().includes(text.toLowerCase())).slice(0, 5)
                : []
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Header ─────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greetSub}>Good day</Text>
                        <Text style={styles.greetName}>{user?.name?.split(' ')[0]}</Text>
                    </View>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
                    </View>
                </View>

                {/* ── Location ───────────────────────────────────────────── */}
                <View style={styles.locationRow}>
                    <View style={styles.locationIconBox}>
                        <Ionicons name="location" size={16} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.locationLabel}>Your Location</Text>
                        {locLoading
                            ? <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: 'flex-start', marginTop: 2 }} />
                            : <Text style={styles.locationValue} numberOfLines={1}>{locationText}</Text>
                        }
                    </View>
                    {/* Vehicles shortcut chip */}
                    <TouchableOpacity
                        style={styles.vehicleChip}
                        onPress={() => router.push('/(customer)/my-vehicles' as any)}
                    >
                        <Ionicons name="bicycle-outline" size={15} color={Colors.primary} />
                        <Text style={styles.vehicleChipText}>My Vehicles</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Search ─────────────────────────────────────────────── */}
                <View style={styles.searchWrap}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={18} color={Colors.textTertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search services..."
                            placeholderTextColor={Colors.textTertiary}
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchQuery(''); setSuggestions([]); }}>
                                <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                            </TouchableOpacity>
                        )}
                    </View>
                    {suggestions.length > 0 && (
                        <View style={styles.suggestionBox}>
                            {suggestions.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={styles.suggestionRow}
                                    onPress={() => { setSearchQuery(s); setSuggestions([]); router.push('/(customer)' as any); }}
                                >
                                    <Ionicons name="build-outline" size={15} color={Colors.textTertiary} />
                                    <Text style={styles.suggestionText}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* ── Offers ─────────────────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>Offers & Deals</Text>
                        <TouchableOpacity><Text style={styles.sectionLink}>View all</Text></TouchableOpacity>
                    </View>
                    <OfferSlider />
                </View>

                {/* ── Services Cards ─────────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Our Services</Text>
                    <View style={styles.servicesRow}>
                        <TouchableOpacity
                            style={[styles.serviceCard, { backgroundColor: Colors.primary }]}
                            onPress={() => router.push('/(customer)' as any)}
                            activeOpacity={0.88}
                        >
                            <View style={styles.serviceCardIcon}>
                                <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
                            </View>
                            <Text style={styles.serviceCardTitle}>Book a{'\n'}Service</Text>
                            <Text style={styles.serviceCardDesc}>Schedule at your preferred garage</Text>
                            <View style={styles.serviceCardArrow}>
                                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.serviceCard, { backgroundColor: '#1D4ED8' }]}
                            activeOpacity={0.88}
                        >
                            <View style={styles.serviceCardIcon}>
                                <Ionicons name="water-outline" size={22} color="#1D4ED8" />
                            </View>
                            <Text style={styles.serviceCardTitle}>Washing{'\n'}Service</Text>
                            <Text style={styles.serviceCardDesc}>Deep clean at your doorstep</Text>
                            <View style={styles.serviceCardArrow}>
                                <Ionicons name="arrow-forward" size={14} color="#1D4ED8" />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── CTA Banner ─────────────────────────────────────────── */}
                <TouchableOpacity
                    style={styles.ctaBanner}
                    onPress={() => router.push('/(customer)' as any)}
                    activeOpacity={0.9}
                >
                    <View style={styles.ctaLeft}>
                        <View style={styles.ctaIconBox}>
                            <Ionicons name="flash" size={20} color={Colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.ctaTitle}>Book Your First Service</Text>
                            <Text style={styles.ctaSub}>Find garages near you in seconds</Text>
                        </View>
                    </View>
                    <View style={styles.ctaArrow}>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </View>
                </TouchableOpacity>

                {/* ── Quick Services ─────────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>Quick Services</Text>
                        <TouchableOpacity><Text style={styles.sectionLink}>View all</Text></TouchableOpacity>
                    </View>
                    <View style={styles.quickGrid}>
                        {QUICK_SERVICES.map((s) => (
                            <TouchableOpacity
                                key={s.id}
                                style={[styles.quickBlock, { backgroundColor: s.bg, width: ITEM_W }]}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.quickIconBox, { backgroundColor: s.color + '20' }]}>
                                    <Ionicons name={s.icon} size={22} color={s.color} />
                                </View>
                                <Text style={[styles.quickLabel, { color: s.color }]}>{s.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* ── Vehicle Prompt Modal ────────────────────────────────────── */}
            <Modal
                visible={showVehiclePrompt}
                transparent
                animationType="fade"
                onRequestClose={() => closeVehiclePrompt()}
            >
                <Pressable style={styles.promptOverlay} onPress={() => closeVehiclePrompt()} />
                <Animated.View style={[styles.promptSheet, {
                    transform: [{
                        translateY: slideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [400, 0],
                        }),
                    }],
                }]}>
                    <View style={styles.promptHandle} />

                    {/* Icon */}
                    <View style={styles.promptIconWrap}>
                        <View style={styles.promptIconCircle}>
                            <Ionicons name="bicycle-outline" size={44} color={Colors.primary} />
                        </View>
                        <View style={styles.promptIconBadge}>
                            <Ionicons name="add" size={14} color="#fff" />
                        </View>
                    </View>

                    <Text style={styles.promptTitle}>Add Your Vehicle</Text>
                    <Text style={styles.promptDesc}>
                        Save your bike or scooty details once and book
                        services faster — no need to re-enter them every time!
                    </Text>

                    <View style={styles.promptActions}>
                        <TouchableOpacity
                            style={styles.promptPrimaryBtn}
                            onPress={() => closeVehiclePrompt(true)}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#fff" />
                            <Text style={styles.promptPrimaryText}>Add Vehicle Now</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.promptSecondaryBtn}
                            onPress={() => closeVehiclePrompt()}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.promptSecondaryText}>Maybe Later</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { paddingBottom: 32 },

    // Header
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingTop: 56, paddingBottom: Spacing.lg,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    greetSub: { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
    greetName: { ...Typography.h1, color: Colors.textPrimary, marginTop: 2 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { ...Typography.h3, color: '#fff', fontWeight: '700' },

    // Location row — now has vehicle chip instead of dropdown
    locationRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
        marginBottom: Spacing.xs,
    },
    locationIconBox: {
        width: 32, height: 32, borderRadius: Radius.sm,
        backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
    },
    locationLabel: { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
    locationValue: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600', marginTop: 2 },
    vehicleChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.primaryLight, borderRadius: Radius.md,
        paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
        borderWidth: 1, borderColor: Colors.primary + '40',
    },
    vehicleChipText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

    // Search
    searchWrap: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.xs },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bg, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
    searchInput: { ...Typography.bodyLg, flex: 1, color: Colors.textPrimary },
    suggestionBox: { backgroundColor: Colors.surface, borderRadius: Radius.lg, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border, ...Shadow.md, overflow: 'hidden' },
    suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 13, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    suggestionText: { ...Typography.body, color: Colors.textPrimary },

    // Sections
    section: { backgroundColor: Colors.surface, padding: Spacing.md, marginBottom: Spacing.xs },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    sectionTitle: { ...Typography.h2, color: Colors.textPrimary },
    sectionLink: { ...Typography.buttonSm, color: Colors.primary },

    // Service cards
    servicesRow: { flexDirection: 'row', gap: Spacing.sm },
    serviceCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, minHeight: 160, justifyContent: 'space-between' },
    serviceCardIcon: { width: 40, height: 40, borderRadius: Radius.sm, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
    serviceCardTitle: { ...Typography.h2, color: '#fff', lineHeight: 26 },
    serviceCardDesc: { ...Typography.caption, color: 'rgba(255,255,255,0.75)', marginTop: Spacing.xs, lineHeight: 16 },
    serviceCardArrow: { alignSelf: 'flex-end', backgroundColor: '#fff', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },

    // CTA
    ctaBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.borderLight, marginBottom: Spacing.xs },
    ctaLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
    ctaIconBox: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    ctaTitle: { ...Typography.h3, color: Colors.textPrimary },
    ctaSub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
    ctaArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },

    // Quick services
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    quickBlock: { borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: Spacing.sm },
    quickIconBox: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    quickLabel: { ...Typography.caption, fontWeight: '600', textAlign: 'center' },

    // Vehicle prompt
    promptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    promptSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: Spacing.lg,
        paddingBottom: 48,
        alignItems: 'center',
    },
    promptHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, marginTop: Spacing.sm, marginBottom: Spacing.lg },
    promptIconWrap: { position: 'relative', marginBottom: Spacing.md },
    promptIconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    promptIconBadge: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.surface },
    promptTitle: { ...Typography.h2, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.xs },
    promptDesc: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg, paddingHorizontal: Spacing.sm },
    promptActions: { width: '100%', gap: Spacing.sm },
    promptPrimaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md },
    promptPrimaryText: { ...Typography.button, color: '#fff', fontWeight: '700' },
    promptSecondaryBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
    promptSecondaryText: { ...Typography.body, color: Colors.textTertiary, fontWeight: '600' },
});
