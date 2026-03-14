import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList, Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

type VehicleType = 'bike' | 'scooty';

// ─── Offer Slides ─────────────────────────────────────────────────────────────
const OFFER_SLIDES = [
    { id: '1', title: '20% Off Full Service', desc: 'Valid on all bike servicing this month', bg: '#FF6B35', icon: '🔧', tag: 'LIMITED OFFER' },
    { id: '2', title: 'Free Oil Check', desc: 'Get a free oil inspection with every booking', bg: '#2563EB', icon: '🛢️', tag: 'FREE SERVICE' },
    { id: '3', title: 'Tyre Checkup ₹99', desc: 'Full tyre inspection & nitrogen fill', bg: '#7C3AED', icon: '⚙️', tag: 'BEST VALUE' },
    { id: '4', title: 'Battery Replacement', desc: '1 year warranty on all battery installs', bg: '#059669', icon: '🔋', tag: 'WARRANTY' },
];

// ─── Curated Services ─────────────────────────────────────────────────────────
const CURATED_SERVICES = [
    { id: '1', label: 'Batteries', icon: '🔋', color: '#059669', bg: '#ECFDF5' },
    { id: '2', label: 'Brakes', icon: '🛑', color: '#DC2626', bg: '#FEF2F2' },
    { id: '3', label: 'Lights', icon: '💡', color: '#D97706', bg: '#FFFBEB' },
    { id: '4', label: 'Clutch', icon: '⚙️', color: '#7C3AED', bg: '#F5F3FF' },
    { id: '5', label: 'Tyres', icon: '🔵', color: '#2563EB', bg: '#EFF6FF' },
    { id: '6', label: 'Spare Parts', icon: '🔩', color: '#FF6B35', bg: '#FFF7ED' },
];

// ─── All searchable services ──────────────────────────────────────────────────
const ALL_SERVICES = [
    'Oil Change', 'Full Service', 'Tyre Puncture Fix', 'Chain & Sprocket Service',
    'Brake Adjustment', 'Air Filter Clean', 'Battery Check', 'Battery Replacement',
    'Clutch Repair', 'Gear Adjustment', 'Engine Tune-up', 'Belt Change',
    'CVT Service', 'Body Work', 'Headlight Fix', 'Lights Repair',
    'Wheel Alignment', 'Suspension Check', 'Coolant Flush', 'Spark Plug',
    'Washing', 'Foam Wash', 'Spare Parts', 'Nitrogen Fill',
];

// ─── Vehicle Dropdown ─────────────────────────────────────────────────────────
interface VehicleDropdownProps {
    value: VehicleType;
    onChange: (v: VehicleType) => void;
}

function VehicleDropdown({ value, onChange }: VehicleDropdownProps) {
    const [open, setOpen] = useState(false);

    const OPTIONS: { value: VehicleType; label: string; icon: string }[] = [
        { value: 'bike', label: 'Bike', icon: '🏍️' },
        { value: 'scooty', label: 'Scooty', icon: '🛵' },
    ];

    const selected = OPTIONS.find((o) => o.value === value)!;

    return (
        <>
            <TouchableOpacity
                style={vdStyles.trigger}
                onPress={() => setOpen(true)}
                activeOpacity={0.85}
            >
                <Text style={vdStyles.triggerIcon}>{selected.icon}</Text>
                <Text style={vdStyles.triggerLabel}>{selected.label}</Text>
                <Text style={vdStyles.triggerArrow}>▾</Text>
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <TouchableOpacity
                    style={vdStyles.backdrop}
                    activeOpacity={1}
                    onPress={() => setOpen(false)}
                >
                    <View style={vdStyles.sheet}>
                        <Text style={vdStyles.sheetTitle}>Select Vehicle</Text>
                        {OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    vdStyles.option,
                                    value === opt.value && vdStyles.optionActive,
                                ]}
                                onPress={() => { onChange(opt.value); setOpen(false); }}
                            >
                                <Text style={vdStyles.optionIcon}>{opt.icon}</Text>
                                <Text style={[
                                    vdStyles.optionLabel,
                                    value === opt.value && vdStyles.optionLabelActive,
                                ]}>
                                    {opt.label}
                                </Text>
                                {value === opt.value ? (
                                    <Text style={vdStyles.optionCheck}>✓</Text>
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const vdStyles = StyleSheet.create({
    trigger: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF3EF', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 10,
        borderWidth: 1.5, borderColor: '#FF6B35', gap: 6,
    },
    triggerIcon: { fontSize: 18 },
    triggerLabel: { fontSize: 14, fontWeight: '700', color: '#FF6B35' },
    triggerArrow: { fontSize: 14, color: '#FF6B35', fontWeight: 'bold' },

    backdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center', alignItems: 'center', padding: 40,
    },
    sheet: {
        backgroundColor: '#fff', borderRadius: 20,
        width: '100%', padding: 20, elevation: 10,
    },
    sheetTitle: {
        fontSize: 16, fontWeight: 'bold', color: '#222',
        marginBottom: 14, textAlign: 'center',
    },
    option: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        padding: 14, borderRadius: 12, marginBottom: 8,
        backgroundColor: '#f9f9f9', borderWidth: 1.5, borderColor: '#f0f0f0',
    },
    optionActive: { borderColor: '#FF6B35', backgroundColor: '#FFF3EF' },
    optionIcon: { fontSize: 26 },
    optionLabel: { fontSize: 16, fontWeight: '600', color: '#555', flex: 1 },
    optionLabelActive: { color: '#FF6B35' },
    optionCheck: { fontSize: 18, color: '#FF6B35', fontWeight: 'bold' },
});

// ─── Offer Slider ─────────────────────────────────────────────────────────────
function OfferSlider() {
    const flatListRef = useRef<FlatList>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const next = (activeIndex + 1) % OFFER_SLIDES.length;
            flatListRef.current?.scrollToIndex({ index: next, animated: true });
            setActiveIndex(next);
        }, 3000);
        return () => clearInterval(interval);
    }, [activeIndex]);

    return (
        <View style={sliderStyles.container}>
            <FlatList
                ref={flatListRef}
                data={OFFER_SLIDES}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
                    setActiveIndex(idx);
                }}
                renderItem={({ item }) => (
                    <View style={[sliderStyles.slide, { backgroundColor: item.bg, width: width - 32 }]}>
                        <View style={sliderStyles.slideTag}>
                            <Text style={sliderStyles.slideTagText}>{item.tag}</Text>
                        </View>
                        <View style={sliderStyles.slideContent}>
                            <View>
                                <Text style={sliderStyles.slideTitle}>{item.title}</Text>
                                <Text style={sliderStyles.slideDesc}>{item.desc}</Text>
                            </View>
                            <Text style={sliderStyles.slideIcon}>{item.icon}</Text>
                        </View>
                    </View>
                )}
            />
            <View style={sliderStyles.dots}>
                {OFFER_SLIDES.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            sliderStyles.dot,
                            { width: i === activeIndex ? 20 : 6, backgroundColor: i === activeIndex ? '#FF6B35' : '#ddd' },
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const sliderStyles = StyleSheet.create({
    container: { marginBottom: 8 },
    slide: { borderRadius: 16, padding: 20, minHeight: 130, justifyContent: 'space-between' },
    slideTag: {
        backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start',
        paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 8,
    },
    slideTagText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    slideContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    slideTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    slideDesc: { fontSize: 13, color: 'rgba(255,255,255,0.85)', maxWidth: '75%', lineHeight: 18 },
    slideIcon: { fontSize: 48 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
    dot: { height: 6, borderRadius: 3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
    const user = useAuthStore((s) => s.user);
    const router = useRouter();

    const [vehicle, setVehicle] = useState<VehicleType>('bike');
    const [locationText, setLocationText] = useState('Fetching location...');
    const [locLoading, setLocLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // ── Fetch GPS location on mount ──────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationText('Location permission denied');
                setLocLoading(false);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            const [place] = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
            if (place) {
                const parts = [place.street, place.district ?? place.subregion, place.city]
                    .filter(Boolean);
                setLocationText(parts.join(', '));
            } else {
                setLocationText('Location found');
            }
            setLocLoading(false);
        })();
    }, []);

    // ── Search suggestions ───────────────────────────────────────────────────
    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text.trim().length === 0) {
            setSuggestions([]);
            return;
        }
        const filtered = ALL_SERVICES.filter((s) =>
            s.toLowerCase().includes(text.toLowerCase())
        );
        setSuggestions(filtered.slice(0, 6));
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >

            {/* ── SECTION 1: Header + Location + Vehicle + Search ─────────── */}
            <View style={styles.section1}>

                {/* Greeting row */}
                <View style={styles.greetRow}>
                    <View>
                        <Text style={styles.greetSub}>Good day,</Text>
                        <Text style={styles.greetName}>{user?.name?.split(' ')[0]} 👋</Text>
                    </View>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
                    </View>
                </View>

                {/* Location row */}
                <View style={styles.locationRow}>
                    <View style={styles.locationLeft}>
                        <Text style={styles.locationPinIcon}>📍</Text>
                        <View>
                            <Text style={styles.locationLabel}>Your Location</Text>
                            {locLoading ? (
                                <ActivityIndicator size="small" color="#FF6B35" style={{ alignSelf: 'flex-start' }} />
                            ) : (
                                <Text style={styles.locationValue} numberOfLines={1}>{locationText}</Text>
                            )}
                        </View>
                    </View>

                    {/* Vehicle dropdown on the right */}
                    <VehicleDropdown value={vehicle} onChange={setVehicle} />
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Search bar */}
                <View>
                    <View style={styles.searchBox}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder={`Search ${vehicle} services...`}
                            placeholderTextColor="#aaa"
                            value={searchQuery}
                            onChangeText={handleSearch}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 ? (
                            <TouchableOpacity onPress={() => { setSearchQuery(''); setSuggestions([]); }}>
                                <Text style={styles.clearBtn}>✕</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {/* Suggestions dropdown */}
                    {suggestions.length > 0 ? (
                        <View style={styles.suggestionBox}>
                            {suggestions.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={styles.suggestionItem}
                                    onPress={() => {
                                        setSearchQuery(s);
                                        setSuggestions([]);
                                        router.push('/(customer)');
                                    }}
                                >
                                    <Text style={styles.suggestionIcon}>🔧</Text>
                                    <Text style={styles.suggestionText}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : null}
                </View>
            </View>

            {/* ── SECTION 2: Offer Slider ──────────────────────────────────── */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🔥 Offers & Deals</Text>
                    <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
                </View>
                <OfferSlider />
            </View>

            {/* ── SECTION 3: Split cards ───────────────────────────────────── */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🛠️ Our Services</Text>
                </View>
                <View style={styles.splitRow}>
                    <TouchableOpacity
                        style={[styles.splitCard, { backgroundColor: '#FF6B35' }]}
                        onPress={() => router.push('/(customer)')}
                        activeOpacity={0.88}
                    >
                        <View style={styles.splitIconBox}>
                            <Text style={styles.splitIcon}>📅</Text>
                        </View>
                        <Text style={styles.splitCardTitle}>Book a{'\n'}Service</Text>
                        <Text style={styles.splitCardDesc}>
                            Schedule at your preferred garage & time
                        </Text>
                        <View style={styles.splitArrow}>
                            <Text style={styles.splitArrowText}>→</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.splitCard, { backgroundColor: '#2563EB' }]}
                        activeOpacity={0.88}
                    >
                        <View style={styles.splitIconBox}>
                            <Text style={styles.splitIcon}>🚿</Text>
                        </View>
                        <Text style={styles.splitCardTitle}>Washing{'\n'}Service</Text>
                        <Text style={styles.splitCardDesc}>
                            Deep clean & foam wash at your doorstep
                        </Text>
                        <View style={styles.splitArrow}>
                            <Text style={styles.splitArrowText}>→</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── SECTION 4: CTA ──────────────────────────────────────────── */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.ctaCard}
                    onPress={() => router.push('/(customer)')}
                    activeOpacity={0.9}
                >
                    <View style={styles.ctaLeft}>
                        <Text style={styles.ctaEmoji}>🏍️</Text>
                        <View>
                            <Text style={styles.ctaTitle}>Book Your First Service</Text>
                            <Text style={styles.ctaSubtitle}>Find garages near you in seconds</Text>
                        </View>
                    </View>
                    <View style={styles.ctaArrowBox}>
                        <Text style={styles.ctaArrow}>→</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* ── SECTION 5: Curated Services ─────────────────────────────── */}
            {/* ── SECTION 5: Curated Services ─────────────────────────────── */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>⚡ Quick Services</Text>
                    <TouchableOpacity><Text style={styles.seeAll}>View all</Text></TouchableOpacity>
                </View>

                <View style={styles.serviceGrid}>
                    {CURATED_SERVICES.map((service) => (
                        <TouchableOpacity
                            key={service.id}
                            style={[styles.serviceBlock, { backgroundColor: service.bg }]}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.serviceIconCircle, { backgroundColor: service.color + '25' }]}>
                                <Text style={styles.serviceIcon}>{service.icon}</Text>
                            </View>
                            <Text style={[styles.serviceLabel, { color: service.color }]}>
                                {service.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* </View> */}

        </ScrollView >
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },

    // Section 1
    section1: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 20,
        marginBottom: 10,
    },
    greetRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 18,
    },
    greetSub: { fontSize: 13, color: '#aaa' },
    greetName: { fontSize: 22, fontWeight: 'bold', color: '#222' },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

    // Location row
    locationRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16,
    },
    locationLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 12 },
    locationPinIcon: { fontSize: 22 },
    locationLabel: { fontSize: 11, color: '#aaa', fontWeight: '500' },
    locationValue: { fontSize: 14, fontWeight: '700', color: '#222', maxWidth: width * 0.45 },

    divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 16 },

    // Search
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f5f5f5', borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 12,
        borderWidth: 1, borderColor: '#eee', gap: 8,
    },
    searchIcon: { fontSize: 16 },
    searchInput: { flex: 1, fontSize: 14, color: '#222' },
    clearBtn: { fontSize: 14, color: '#aaa', paddingHorizontal: 4 },

    // Suggestions
    suggestionBox: {
        backgroundColor: '#fff', borderRadius: 12, marginTop: 4,
        borderWidth: 1, borderColor: '#eee', elevation: 4,
        shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
        overflow: 'hidden',
    },
    suggestionItem: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: 14,
        borderBottomWidth: 1, borderBottomColor: '#f8f8f8',
    },
    suggestionIcon: { fontSize: 16 },
    suggestionText: { fontSize: 14, color: '#333', fontWeight: '500' },

    // Generic section
    section: {
        backgroundColor: '#fff', paddingHorizontal: 16,
        paddingTop: 18, paddingBottom: 18, marginBottom: 10,
    },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14,
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    seeAll: { fontSize: 13, color: '#FF6B35', fontWeight: '600' },

    // Split cards
    splitRow: { flexDirection: 'row', gap: 12 },
    splitCard: { flex: 1, borderRadius: 18, padding: 16, minHeight: 170, justifyContent: 'space-between' },
    splitIconBox: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    splitIcon: { fontSize: 22 },
    splitCardTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff', lineHeight: 22, marginBottom: 6 },
    splitCardDesc: { fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 15, flex: 1 },
    splitArrow: {
        alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,0.25)',
        width: 30, height: 30, borderRadius: 15,
        justifyContent: 'center', alignItems: 'center', marginTop: 8,
    },
    splitArrowText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    // CTA
    ctaCard: {
        backgroundColor: '#FFF3EF', borderRadius: 16, padding: 18,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', borderWidth: 1, borderColor: '#FFD9C7',
    },
    ctaLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    ctaEmoji: { fontSize: 36 },
    ctaTitle: { fontSize: 16, fontWeight: 'bold', color: '#FF6B35' },
    ctaSubtitle: { fontSize: 12, color: '#aaa', marginTop: 2 },
    ctaArrowBox: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center',
    },
    ctaArrow: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

    // Service grid
    // serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    // serviceBlock: {
    //     width: (width - 56) / 3, borderRadius: 16,
    //     padding: 14, alignItems: 'center', justifyContent: 'center', gap: 8,
    // },
    // serviceIconCircle: {
    //     width: 52, height: 52, borderRadius: 26,
    //     justifyContent: 'center', alignItems: 'center',
    // },
    // serviceIcon: { fontSize: 24 },
    // serviceLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
    // ─── REPLACE these 4 styles at the bottom of StyleSheet.create({}) ───────────

    serviceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,                        // ← gap between items
        paddingHorizontal: 1,
    },
    serviceBlock: {
        width: (width - 56) / 3,        // ← (screenWidth - padding - gaps) / 3
        paddingVertical: 14,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 14,               // ← rounded corners on each block
    },
    serviceIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceIcon: { fontSize: 20 },
    serviceLabel: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },

});
