// app/(customer)/location.tsx

import React, {
    useState, useRef, useCallback, useEffect,
} from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, TextInput, Modal, ActivityIndicator,
    Animated, Dimensions, Platform, Alert,
    KeyboardAvoidingView, StatusBar,
} from 'react-native';
import MapView, { Region, PROVIDER_DEFAULT, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';
import { useLocationStore } from '../../../store/locationStore';
import { CreateLocationProfile, LocationProfile } from '../../../utils/services/locationProfileService';

// ─── Types ────────────────────────────────────────────────────────────────────
type AddressType = 'home' | 'office' | 'other';
type ScreenMode = 'browse' | 'picking' | 'fullscreen';

// ─── Constants ────────────────────────────────────────────────────────────────
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const TYPE_META: Record<AddressType, { icon: string; color: string; bg: string; label: string }> = {
    home: { icon: 'home', color: '#16A34A', bg: '#DCFCE7', label: 'Home' },
    office: { icon: 'briefcase', color: '#2563EB', bg: '#DBEAFE', label: 'Office' },
    other: { icon: 'location-sharp', color: '#FF6B35', bg: '#FFF4F0', label: 'Other' },
};

const DEFAULT_REGION: Region = {
    latitude: 21.1458,
    longitude: 79.0882,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
};

// Map height values per mode
const MAP_HEIGHT = {
    browse: SCREEN_HEIGHT * 0.38,
    picking: SCREEN_HEIGHT * 0.62,
    fullscreen: SCREEN_HEIGHT,          // true fullscreen
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (results.length > 0) {
            const r = results[0];
            return [r.name, r.street, r.district, r.city, r.postalCode]
                .filter(Boolean)
                .join(', ');
        }
    } catch { /* silently fail */ }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LocationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();

    // ── Zustand store ─────────────────────────────────────────────────────────
    const {
        profiles,
        loading: loadingProfiles,
        error: apiError,
        addProfile,
        updateProfile,
        deleteProfile,
        fetchProfiles,
        setActiveProfile,
    } = useLocationStore();

    const isOnboarding = onboarding === 'true' || profiles.length === 0;

    // ── Mode + animated map height ────────────────────────────────────────────
    const [mode, setMode] = useState<ScreenMode>('browse');
    const mapHeightAnim = useRef(new Animated.Value(MAP_HEIGHT.browse)).current;

    const animateToMode = useCallback((nextMode: ScreenMode) => {
        Animated.spring(mapHeightAnim, {
            toValue: MAP_HEIGHT[nextMode],
            useNativeDriver: false,
            damping: 20,
            stiffness: 180,
        }).start();
        setMode(nextMode);
    }, [mapHeightAnim]);

    // ── ✅ FIX: Uncontrolled region — use ref instead of state for MapView ────
    // The jitter was caused by passing `region` as a controlled prop, which fights
    // with the map's internal animation. We track it in a ref only, and only call
    // setRegion (state) when we NEED to programmatically fly the camera.
    const regionRef = useRef<Region>(DEFAULT_REGION);

    // ✅ Tracks which profile's marker to show on map
    const [selectedMarker, setSelectedMarker] = useState<{
        latitude: number;
        longitude: number;
        label: string;
        type: AddressType;
    } | null>(null);

    // ✅ This state is ONLY used for programmatic camera moves (animateToRegion).
    // It is NOT passed as the `region` prop to MapView.
    const [pinAddress, setPinAddress] = useState('');
    const [geocoding, setGeocoding] = useState(false);
    const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ✅ Only update the ref — never set state here to avoid re-render loop
    const handleRegionChangeComplete = useCallback((r: Region) => {
        regionRef.current = r;
        if (mode !== 'picking' && mode !== 'fullscreen') return;
        if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
        setGeocoding(true);
        geocodeTimer.current = setTimeout(async () => {
            const addr = await reverseGeocode(r.latitude, r.longitude);
            setPinAddress(addr);
            setGeocoding(false);
        }, 600);
    }, [mode]);

    // ── Current location ──────────────────────────────────────────────────────
    const [detectingLocation, setDetectingLocation] = useState(false);

    const handleDetectCurrentLocation = async () => {
        setDetectingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Needed', 'Enable location access in Settings.');
                return;
            }
            const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const { latitude, longitude } = pos.coords;
            const newRegion: Region = {
                latitude, longitude,
                latitudeDelta: 0.012, longitudeDelta: 0.012,
            };
            // ✅ Update ref first, then animate camera — no state flicker
            regionRef.current = newRegion;
            mapRef.current?.animateToRegion(newRegion, 800);
            if (mode === 'picking' || mode === 'fullscreen') {
                setGeocoding(true);
                setPinAddress(await reverseGeocode(latitude, longitude));
                setGeocoding(false);
            }
        } catch {
            Alert.alert('Error', 'Could not detect location. Please try again.');
        } finally {
            setDetectingLocation(false);
        }
    };

    // ── Picking mode ──────────────────────────────────────────────────────────
    const enterPickingMode = async (fullscreen = false) => {
        animateToMode(fullscreen ? 'fullscreen' : 'picking');
        setSelectedMarker(null);   // ✅ clear marker — pin takes over
        setGeocoding(true);
        const r = regionRef.current;
        setPinAddress(await reverseGeocode(r.latitude, r.longitude));
        setGeocoding(false);
    };

    const exitPickingMode = () => {
        animateToMode('browse');
        setNewAddressModal(false);
        setEditingProfile(null);
    };

    // ── Toggle fullscreen ─────────────────────────────────────────────────────
    const toggleFullscreen = () => {
        if (mode === 'fullscreen') {
            animateToMode('picking');
        } else {
            animateToMode('fullscreen');
        }
    };

    // ── Add / Edit modal ──────────────────────────────────────────────────────
    const [newAddressModal, setNewAddressModal] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [newType, setNewType] = useState<AddressType>('home');
    const [savingAddress, setSavingAddress] = useState(false);
    const [editingProfile, setEditingProfile] = useState<LocationProfile | null>(null);

    const openAddModal = () => {
        setNewLabel('');
        setNewType('home');
        setEditingProfile(null);
        enterPickingMode();  // modal only opens when user taps "Confirm this Location"
    };

    const openEditModal = (profile: LocationProfile) => {
        setEditingProfile(profile);
        setNewLabel(profile.label);
        setNewType(profile.type);
        const r: Region = {
            latitude: Number(profile.latitude),
            longitude: Number(profile.longitude),
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
        };
        regionRef.current = r;
        mapRef.current?.animateToRegion(r, 600);
        setPinAddress(profile.address);
        enterPickingMode();  // ✅ modal opens only when user taps "Confirm this Location"
    };

    const handleSaveAddress = async () => {
        if (!pinAddress) {
            Alert.alert('No location', 'Drag the map to choose a location first.');
            return;
        }
        setSavingAddress(true);
        try {
            const r = regionRef.current;
            const payload: CreateLocationProfile = {
                type: newType,
                label: newLabel.trim() || TYPE_META[newType].label,
                address: pinAddress,
                latitude: r.latitude,
                longitude: r.longitude,
            };

            if (editingProfile) {
                await updateProfile(editingProfile.id, payload);
                setNewAddressModal(false);
                exitPickingMode();
            } else {
                const created = await addProfile(payload);
                setActiveProfile(created);
                setNewAddressModal(false);
                exitPickingMode();
                if (isOnboarding) {
                    router.replace('/(customer)/home' as any);
                    return;
                }
            }
        } catch {
            Alert.alert('Error', 'Could not save address. Please try again.');
        } finally {
            setSavingAddress(false);
        }
    };

    // ── Delete profile ────────────────────────────────────────────────────────
    const handleDeleteProfile = (id: number) => {
        Alert.alert('Remove Address', 'Delete this saved address?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteProfile(id);
                    } catch {
                        Alert.alert('Error', 'Could not delete address.');
                    }
                },
            },
        ]);
    };

    // ── Navigate map to a profile ─────────────────────────────────────────────
    const handleGoToAddress = (profile: LocationProfile) => {
        const r: Region = {
            latitude: Number(profile.latitude),
            longitude: Number(profile.longitude),
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
        };
        regionRef.current = r;
        mapRef.current?.animateToRegion(r, 600);

        const marker = {
            latitude: Number(profile.latitude),   // ✅ force number, not string
            longitude: Number(profile.longitude),  // ✅ force number, not string
            label: profile.label,
            type: profile.type as AddressType,
        };

        console.log('📍 Setting marker:', marker);  // ✅ check this fires
        setSelectedMarker(marker);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    const isPickingOrFull = mode === 'picking' || mode === 'fullscreen';
    const isFullscreen = mode === 'fullscreen';

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* ── MAP ──────────────────────────────────────────────────────── */}
            <Animated.View style={[styles.mapWrapper, { height: mapHeightAnim }]}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFillObject}
                    provider={PROVIDER_DEFAULT}
                    // ✅ KEY FIX: use initialRegion only, never pass `region` prop
                    // This makes it uncontrolled — no more jitter
                    initialRegion={DEFAULT_REGION}
                    onRegionChangeComplete={handleRegionChangeComplete}
                    showsUserLocation
                    showsMyLocationButton={false}
                    showsCompass={false}
                    rotateEnabled={false}
                >
                    {/* Your real marker */}
                    {selectedMarker && (
                        <Marker
                            coordinate={{
                                latitude: selectedMarker.latitude,
                                longitude: selectedMarker.longitude,
                            }}
                            tracksViewChanges={true}   // ✅ Changed to true
                            anchor={{ x: 0.5, y: 1 }}  // ✅ Pointer tip sits on coordinate
                        >
                            <View style={styles.markerWrapper}>
                                <View style={[
                                    styles.markerBubble,
                                    {
                                        backgroundColor: TYPE_META[selectedMarker.type].bg,
                                        borderColor: TYPE_META[selectedMarker.type].color,
                                    },
                                ]}>
                                    <Ionicons
                                        name={TYPE_META[selectedMarker.type].icon as any}
                                        size={14}
                                        color={TYPE_META[selectedMarker.type].color}
                                    />
                                    <Text style={[
                                        styles.markerLabel,
                                        { color: TYPE_META[selectedMarker.type].color },
                                    ]}>
                                        {/* {selectedMarker.label} */}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.markerPointer,
                                    { borderTopColor: TYPE_META[selectedMarker.type].color },
                                ]} />
                            </View>
                        </Marker>
                    )}
                </MapView>

                {/* Fixed centre pin — only visible in picking/fullscreen */}
                {isPickingOrFull && (
                    <View style={styles.pinContainer} pointerEvents="none">
                        <View style={styles.pinShadow} />
                        <View style={[styles.pinDot, styles.pinDotActive]}>
                            <Ionicons name="location-sharp" size={36} color={Colors.primary} />
                        </View>
                        <View style={styles.pinPulse} />
                    </View>
                )}

                {/* My-location button */}
                <TouchableOpacity
                    style={[styles.myLocBtn, { top: insets.top + 64 }]}
                    onPress={handleDetectCurrentLocation}
                    disabled={detectingLocation}
                    activeOpacity={0.85}
                >
                    {detectingLocation
                        ? <ActivityIndicator size="small" color={Colors.primary} />
                        : <Ionicons name="navigate" size={20} color={Colors.primary} />
                    }
                </TouchableOpacity>

                {/* ✅ Fullscreen toggle button — only in picking modes */}
                {isPickingOrFull && (
                    <TouchableOpacity
                        style={[styles.fullscreenBtn, { top: insets.top + 64 + 52 }]}
                        onPress={toggleFullscreen}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name={isFullscreen ? 'contract-outline' : 'expand-outline'}
                            size={20}
                            color={Colors.primary}
                        />
                    </TouchableOpacity>
                )}

                {/* Address chip at bottom of map */}
                {isPickingOrFull && (
                    <View style={[
                        styles.addressChip,
                        isFullscreen && styles.addressChipFullscreen,
                    ]}>
                        {geocoding
                            ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
                            : <Ionicons name="location-outline" size={15} color={Colors.primary} style={{ marginRight: 6 }} />
                        }
                        <Text style={styles.addressChipText} numberOfLines={2}>
                            {geocoding ? 'Detecting address…' : (pinAddress || 'Drag map to select location')}
                        </Text>
                        {/* Confirm button inside chip when fullscreen */}
                        {isFullscreen && (
                            <TouchableOpacity
                                style={[
                                    styles.chipConfirmBtn,
                                    (geocoding || !pinAddress) && { opacity: 0.4 },
                                ]}
                                onPress={() => setNewAddressModal(true)}
                                disabled={geocoding || !pinAddress}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.chipConfirmText}>Confirm</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Fullscreen: Cancel pill at top */}
                {isFullscreen && (
                    <TouchableOpacity
                        style={[styles.fullscreenCancelBtn, { top: insets.top + 12 }]}
                        onPress={exitPickingMode}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="close" size={16} color={Colors.textPrimary} />
                        <Text style={styles.fullscreenCancelText}>Exit Fullscreen</Text>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* ── HEADER — hidden in fullscreen ─────────────────────────────── */}
            {!isFullscreen && (
                <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => {
                            if (mode === 'picking') {
                                exitPickingMode();
                            } else if (!isOnboarding) {
                                router.back();
                            }
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={22}
                            color={isOnboarding && mode === 'browse'
                                ? Colors.textTertiary
                                : Colors.textPrimary}
                        />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>
                            {mode === 'picking'
                                ? 'Drag to Pin Location'
                                : isOnboarding
                                    ? 'Set Your Location'
                                    : 'Delivery Location'}
                        </Text>
                        {isOnboarding && mode === 'browse' && (
                            <Text style={styles.headerSub}>Required to continue</Text>
                        )}
                        {mode === 'picking' && (
                            <Text style={styles.headerSub}>Move the map to place the pin</Text>
                        )}
                    </View>

                    <View style={{ width: 38 }} />
                </View>
            )}

            {/* ── BOTTOM SHEET — hidden in fullscreen ───────────────────────── */}
            {!isFullscreen && (
                <View style={styles.sheet}>
                    {mode === 'picking' ? (

                        /* ── PICKING MODE ──────────────────────────────────── */
                        <View style={styles.pickingActions}>
                            {/* Expand to fullscreen hint */}
                            <TouchableOpacity
                                style={styles.expandHintRow}
                                onPress={() => animateToMode('fullscreen')}
                                activeOpacity={0.75}
                            >
                                <Ionicons name="expand-outline" size={14} color={Colors.primary} />
                                <Text style={styles.expandHintText}>
                                    Tap to expand map fullscreen for precise pinning
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.confirmBtn,
                                    (geocoding || !pinAddress) && styles.confirmBtnDisabled,
                                ]}
                                onPress={() => setNewAddressModal(true)}
                                disabled={geocoding || !pinAddress}
                                activeOpacity={0.88}
                            >
                                <Ionicons name="checkmark-circle-outline" size={19} color="#fff" />
                                <Text style={styles.confirmBtnText}>Confirm this Location</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelPickBtn} onPress={exitPickingMode}>
                                <Text style={styles.cancelPickBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                    ) : (

                        /* ── BROWSE MODE ───────────────────────────────────── */
                        <ScrollView
                            contentContainerStyle={styles.sheetScroll}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Onboarding banner */}
                            {isOnboarding && (
                                <View style={styles.onboardingBanner}>
                                    <Ionicons name="location-outline" size={18} color={Colors.primary} />
                                    <Text style={styles.onboardingBannerText}>
                                        Save at least one address to start using MotoBee
                                    </Text>
                                </View>
                            )}

                            {/* Current location row */}
                            <TouchableOpacity
                                style={styles.currentLocRow}
                                onPress={handleDetectCurrentLocation}
                                activeOpacity={0.8}
                            >
                                <View style={styles.currentLocIcon}>
                                    {detectingLocation
                                        ? <ActivityIndicator size="small" color={Colors.primary} />
                                        : <Ionicons name="navigate" size={20} color={Colors.primary} />
                                    }
                                </View>
                                <View style={styles.currentLocText}>
                                    <Text style={styles.currentLocTitle}>Use Current Location</Text>
                                    <Text style={styles.currentLocSub}>GPS — auto-detected</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            {/* Saved addresses header */}
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>SAVED ADDRESSES</Text>
                                <TouchableOpacity
                                    style={styles.addBtn}
                                    onPress={openAddModal}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="add" size={16} color={Colors.primary} />
                                    <Text style={styles.addBtnText}>Add New</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Error banner */}
                            {!!apiError && (
                                <View style={styles.errorBanner}>
                                    <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
                                    <Text style={styles.errorBannerText}>{apiError}</Text>
                                    <TouchableOpacity onPress={fetchProfiles}>
                                        <Text style={styles.errorRetry}>Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Profile list */}
                            {loadingProfiles ? (
                                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
                            ) : profiles.length === 0 ? (
                                <EmptyAddresses onAdd={openAddModal} />
                            ) : (
                                profiles.map((profile) => (
                                    <AddressCard
                                        key={profile.id}
                                        profile={profile}
                                        onNavigate={() => handleGoToAddress(profile)}
                                        onEdit={() => openEditModal(profile)}
                                        onDelete={() => handleDeleteProfile(profile.id)}
                                        onSelect={() => setActiveProfile(profile)}
                                    />
                                ))
                            )}

                            {/* Map tip */}
                            <View style={styles.mapTip}>
                                <Ionicons
                                    name="information-circle-outline"
                                    size={14}
                                    color={Colors.textTertiary}
                                />
                                <Text style={styles.mapTipText}>
                                    Drag the map above to explore. Tap "Add New" to pin a specific location.
                                </Text>
                            </View>
                        </ScrollView>
                    )}
                </View>
            )}

            {/* ── ADD / EDIT MODAL ──────────────────────────────────────────── */}
            <Modal
                visible={newAddressModal}
                transparent
                animationType="slide"
                onRequestClose={() => setNewAddressModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalBackdrop}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />

                        <Text style={styles.modalTitle}>
                            {editingProfile ? 'Edit Address' : 'Save this Address'}
                        </Text>

                        {/* Location preview */}
                        <View style={styles.modalAddressPreview}>
                            <Ionicons name="location-sharp" size={16} color={Colors.primary} />
                            <Text style={styles.modalAddressText} numberOfLines={2}>
                                {pinAddress || 'No location selected'}
                            </Text>
                        </View>

                        {/* Type selector */}
                        <Text style={styles.modalFieldLabel}>SAVE AS</Text>
                        <View style={styles.typeRow}>
                            {(Object.keys(TYPE_META) as AddressType[]).map((t) => {
                                const meta = TYPE_META[t];
                                const active = newType === t;
                                return (
                                    <TouchableOpacity
                                        key={t}
                                        style={[
                                            styles.typeChip,
                                            active && { backgroundColor: meta.bg, borderColor: meta.color },
                                        ]}
                                        onPress={() => setNewType(t)}
                                        activeOpacity={0.75}
                                    >
                                        <Ionicons
                                            name={meta.icon as any}
                                            size={16}
                                            color={active ? meta.color : Colors.textTertiary}
                                        />
                                        <Text style={[
                                            styles.typeChipText,
                                            active && { color: meta.color, fontWeight: '700' },
                                        ]}>
                                            {meta.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Custom label */}
                        <Text style={styles.modalFieldLabel}>CUSTOM LABEL (OPTIONAL)</Text>
                        <View style={styles.modalInput}>
                            <Ionicons name="pricetag-outline" size={16} color={Colors.textTertiary} />
                            <TextInput
                                style={styles.modalInputField}
                                placeholder={`e.g. ${TYPE_META[newType].label}, Parents' House…`}
                                placeholderTextColor={Colors.textTertiary}
                                value={newLabel}
                                onChangeText={setNewLabel}
                                autoCapitalize="words"
                                returnKeyType="done"
                            />
                        </View>

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setNewAddressModal(false)}
                                disabled={savingAddress}
                            >
                                <Text style={styles.modalCancelText}>Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSaveBtn, savingAddress && { opacity: 0.65 }]}
                                onPress={handleSaveAddress}
                                disabled={savingAddress}
                                activeOpacity={0.88}
                            >
                                {savingAddress
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <>
                                        <Ionicons name="bookmark-outline" size={16} color="#fff" />
                                        <Text style={styles.modalSaveText}>
                                            {editingProfile ? 'Update Address' : 'Save Address'}
                                        </Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function AddressCard({
    profile, onNavigate, onEdit, onDelete, onSelect,
}: {
    profile: LocationProfile;
    onNavigate: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onSelect: () => void;
}) {
    const meta = TYPE_META[profile.type];
    const activeProfile = useLocationStore((s) => s.activeProfile);
    const isActive = activeProfile?.id === profile.id;

    return (
        <TouchableOpacity
            style={[styles.addressCard, isActive && styles.addressCardActive]}
            onPress={() => { onSelect(); onNavigate(); }}
            activeOpacity={0.75}
        >
            <View style={[styles.addressIconBox, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon as any} size={20} color={meta.color} />
            </View>

            <View style={styles.addressInfo}>
                <View style={styles.addressLabelRow}>
                    <Text style={styles.addressLabel}>{profile.label}</Text>
                    {isActive && (
                        <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.addressText} numberOfLines={2}>{profile.address}</Text>
            </View>

            <TouchableOpacity
                style={styles.editBtn}
                onPress={onEdit}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Ionicons name="pencil-outline" size={15} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.deleteBtn}
                onPress={onDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Ionicons name="trash-outline" size={15} color={Colors.error} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

function EmptyAddresses({ onAdd }: { onAdd: () => void }) {
    return (
        <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
                <Ionicons name="location-outline" size={36} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No saved addresses yet</Text>
            <Text style={styles.emptySubtitle}>
                Save your Home and Office for faster booking checkout.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={onAdd} activeOpacity={0.85}>
                <Ionicons name="add-circle-outline" size={17} color={Colors.primary} />
                <Text style={styles.emptyAddBtnText}>Add your first address</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    mapWrapper: { width: '100%', backgroundColor: '#E8EDF2', overflow: 'hidden' },

    pinContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
    },
    pinShadow: {
        position: 'absolute', width: 14, height: 6, borderRadius: 7,
        backgroundColor: 'rgba(0,0,0,0.18)', bottom: -2,
        transform: [{ scaleX: 1.4 }],
    },
    pinDot: {
        marginBottom: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
    },
    pinDotActive: { transform: [{ translateY: -4 }] },
    pinPulse: {
        position: 'absolute', width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.primary + '22',
        borderWidth: 1.5, borderColor: Colors.primary + '55', bottom: 10,
    },

    myLocBtn: {
        position: 'absolute', right: 16, width: 42, height: 42, borderRadius: 21,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
        ...Shadow.md, borderWidth: 1, borderColor: Colors.border,
    },

    // ✅ New fullscreen toggle button
    fullscreenBtn: {
        position: 'absolute', right: 16, width: 42, height: 42, borderRadius: 21,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
        ...Shadow.md, borderWidth: 1, borderColor: Colors.border,
    },

    addressChip: {
        position: 'absolute', bottom: 12, left: 16, right: 16,
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        paddingHorizontal: Spacing.md, paddingVertical: 10,
        ...Shadow.md, borderWidth: 1, borderColor: Colors.border,
    },
    // ✅ Taller chip in fullscreen to show 2 lines + confirm button
    addressChipFullscreen: {
        bottom: 32, borderRadius: Radius.xl,
        paddingVertical: 14, flexWrap: 'wrap',
    },
    addressChipText: {
        ...Typography.body, color: Colors.textPrimary, flex: 1, fontWeight: '500',
    },

    // ✅ Confirm button inside fullscreen chip
    chipConfirmBtn: {
        backgroundColor: Colors.primary, borderRadius: Radius.md,
        paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8,
    },
    chipConfirmText: {
        ...Typography.caption, color: '#fff', fontWeight: '800',
    },

    // ✅ Exit fullscreen pill
    fullscreenCancelBtn: {
        position: 'absolute', left: 16,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8,
        ...Shadow.sm, borderWidth: 1, borderColor: Colors.border,
    },
    fullscreenCancelText: {
        ...Typography.caption, color: Colors.textPrimary, fontWeight: '700',
    },

    header: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight, zIndex: 10,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: Radius.sm,
        backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },
    headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
    headerTitle: { ...Typography.h3, color: Colors.textPrimary },
    headerSub: { ...Typography.caption, color: Colors.textTertiary },

    sheet: {
        flex: 1, backgroundColor: Colors.surface,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        marginTop: -20, ...Shadow.lg, overflow: 'hidden',
    },
    sheetScroll: { paddingBottom: 40 },

    onboardingBanner: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.primary + '12', borderRadius: Radius.md,
        padding: Spacing.md, margin: Spacing.md, marginBottom: 0,
        borderWidth: 1, borderColor: Colors.primary + '33',
    },
    onboardingBannerText: {
        ...Typography.body, color: Colors.primary, flex: 1,
        fontWeight: '600', lineHeight: 20,
    },

    // ✅ Expand hint row in picking mode
    expandHintRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.primary + '0D', borderRadius: Radius.md,
        paddingHorizontal: Spacing.md, paddingVertical: 9,
        borderWidth: 1, borderColor: Colors.primary + '33',
    },
    expandHintText: {
        ...Typography.caption, color: Colors.primary, fontWeight: '600', flex: 1,
    },

    pickingActions: { padding: Spacing.md, gap: Spacing.sm },
    confirmBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, backgroundColor: Colors.primary,
        borderRadius: Radius.lg, paddingVertical: 16,
    },
    confirmBtnDisabled: { opacity: 0.5 },
    confirmBtnText: { ...Typography.button, color: '#fff', fontSize: 16 },
    cancelPickBtn: { alignItems: 'center', paddingVertical: 12 },
    cancelPickBtnText: { ...Typography.button, color: Colors.textSecondary },

    currentLocRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingVertical: 16, paddingHorizontal: Spacing.md,
    },
    currentLocIcon: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: Colors.primary + '18',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: Colors.primary + '44',
    },
    currentLocText: { flex: 1 },
    currentLocTitle: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700' },
    currentLocSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },

    divider: {
        height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.md,
    },

    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.md, paddingTop: 18, paddingBottom: 10,
    },
    sectionTitle: {
        fontSize: 10, fontWeight: '800', color: Colors.textTertiary,
        textTransform: 'uppercase', letterSpacing: 0.9,
    },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.primary + '18',
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary + '55',
    },
    addBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FEF2F2', borderRadius: Radius.md,
        padding: Spacing.sm, marginHorizontal: Spacing.md, marginBottom: 8,
        borderWidth: 1, borderColor: '#FECACA',
    },
    errorBannerText: { ...Typography.caption, color: Colors.error, flex: 1 },
    errorRetry: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

    addressCard: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingVertical: 14, paddingHorizontal: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    addressCardActive: { backgroundColor: Colors.primary + '08' },
    addressIconBox: {
        width: 44, height: 44, borderRadius: Radius.md,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    addressInfo: { flex: 1, gap: 3 },
    addressLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addressLabel: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700' },
    addressText: { ...Typography.caption, color: Colors.textTertiary, lineHeight: 16 },

    activeBadge: {
        backgroundColor: Colors.primary + '18',
        borderRadius: Radius.full,
        paddingHorizontal: 8, paddingVertical: 2,
        borderWidth: 1, borderColor: Colors.primary + '44',
    },
    activeBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },

    editBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: Colors.surfaceAlt,
        alignItems: 'center', justifyContent: 'center',
    },
    deleteBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#FEE2E2',
        alignItems: 'center', justifyContent: 'center',
    },

    emptyState: {
        alignItems: 'center', paddingVertical: 36,
        paddingHorizontal: Spacing.xl, gap: Spacing.sm,
    },
    emptyIcon: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.surfaceAlt,
        alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    },
    emptyTitle: { ...Typography.h3, color: Colors.textPrimary, textAlign: 'center' },
    emptySubtitle: {
        ...Typography.body, color: Colors.textTertiary,
        textAlign: 'center', lineHeight: 20,
    },
    emptyAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.primary + '18',
        borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: 11,
        borderWidth: 1.5, borderColor: Colors.primary + '55', marginTop: 8,
    },
    emptyAddBtnText: { ...Typography.button, color: Colors.primary },

    mapTip: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        margin: Spacing.md, marginTop: 18,
        backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
        padding: Spacing.sm, paddingHorizontal: 10,
    },
    mapTipText: {
        ...Typography.caption, color: Colors.textTertiary, flex: 1, lineHeight: 16,
    },

    modalBackdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: Spacing.md, paddingBottom: 36, gap: Spacing.sm, ...Shadow.lg,
    },
    modalHandle: {
        alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
        backgroundColor: Colors.border, marginBottom: 8,
    },
    modalTitle: { ...Typography.h2, color: Colors.textPrimary, marginBottom: 4 },
    modalAddressPreview: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: Colors.primary + '18', borderRadius: Radius.md,
        padding: Spacing.sm, paddingHorizontal: 12,
        borderWidth: 1, borderColor: Colors.primary + '33',
    },
    modalAddressText: {
        ...Typography.body, color: Colors.textPrimary,
        flex: 1, fontWeight: '500', lineHeight: 20,
    },
    modalFieldLabel: {
        fontSize: 10, fontWeight: '800', color: Colors.textTertiary,
        textTransform: 'uppercase', letterSpacing: 0.9, marginTop: 8,
    },
    typeRow: { flexDirection: 'row', gap: Spacing.sm },
    typeChip: {
        flex: 1, flexDirection: 'column', alignItems: 'center', gap: 5,
        paddingVertical: 12, borderRadius: Radius.md,
        backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
    },
    typeChipText: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '600' },
    modalInput: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.bg, borderRadius: Radius.md,
        paddingHorizontal: Spacing.md, paddingVertical: 12,
        borderWidth: 1.5, borderColor: Colors.border,
    },
    modalInputField: { ...Typography.body, flex: 1, color: Colors.textPrimary },
    modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
    modalCancelBtn: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingVertical: 14, borderRadius: Radius.lg,
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
    },
    modalCancelText: { ...Typography.button, color: Colors.textSecondary },
    modalSaveBtn: {
        flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, paddingVertical: 14, borderRadius: Radius.lg,
        backgroundColor: Colors.primary,
    },
    modalSaveText: { ...Typography.button, color: '#fff' },

    // ── Location marker ───────────────────────────────────────────────────────────
    markerWrapper: {
        alignItems: 'center',
    },
    markerBubble: {
        flexDirection: 'row', alignItems: 'center',
        // gap: 2,
        paddingHorizontal: 6, paddingVertical: 6,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        ...Shadow.md,
    },
    markerLabel: {
        fontSize: 10, fontWeight: '400',
        maxWidth: 150,
    },
    markerPointer: {
        width: 0, height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
    },
});