// app/_layout.tsx

import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions,
  StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from '../context/CartContext';
import { useNotifications } from '../hooks/useNotifications';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';

const { height } = Dimensions.get('window');

// ── AppInit — runs hooks that need to be inside providers ─────────────────────
function AppInit() {
  useNotifications();   // ✅ inside CartProvider + SafeAreaProvider
  return null;
}

// ── AuthGate ──────────────────────────────────────────────────────────────────
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { user, token, isHydrated } = useAuthStore();
  const { profiles, hydrated: locationHydrated, fetchProfiles } = useLocationStore();

  const [navigationReady, setNavigationReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setNavigationReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Fetch location profiles once when customer logs in
  useEffect(() => {
    if (!isHydrated || !token || !user) return;
    if (user.role === 'owner') return;
    fetchProfiles();
  }, [isHydrated, token, user]);

  useEffect(() => {
    if (!isHydrated || !navigationReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOwnerGroup = segments[0] === '(owner)';
    const inCustomerGroup = segments[0] === '(customer)';
    const inLocationScreen = segments[1] === 'location';

    // Not logged in → login
    if (!token || !user) {
      if (!inAuthGroup) router.replace('/(auth)/login' as any);
      return;
    }

    // Owner → owner dashboard
    if (user.role === 'owner') {
      if (!inOwnerGroup) router.replace('/(owner)' as any);
      return;
    }

    // Customer — wait for location profiles
    if (!locationHydrated) return;

    // No saved address → onboarding
    if (profiles.length === 0) {
      if (!inLocationScreen)
        router.replace('/(customer)/location?onboarding=true' as any);
      return;
    }

    // Has address but not in customer group → home
    if (!inCustomerGroup) {
      router.replace('/(customer)/home' as any);
    }

  }, [isHydrated, navigationReady, token, user, locationHydrated, profiles]);

  // Spinner while location profiles load
  if (token && user?.role !== 'owner' && !locationHydrated) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return <Slot />;
}

// ── RootLayout ────────────────────────────────────────────────────────────────
export default function RootLayout() {
  const { isHydrated, hydrate } = useAuthStore();

  const [showWelcome, setShowWelcome] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -height,
        duration: 700,
        useNativeDriver: true,
      }).start(() => setShowWelcome(false));
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  if (!isHydrated) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <CartProvider>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>

          {/* ✅ Hooks that need provider context */}
          <AppInit />

          {/* ✅ Auth + routing logic */}
          <AuthGate />

          {/* ✅ Splash overlay */}
          {showWelcome && (
            <Animated.View
              style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}
            >
              <StatusBar barStyle="light-content" backgroundColor="#FF6B35" />
              <Text style={styles.brand}>{'MOTOBEE'}</Text>
              <Text style={styles.tagline}>{'Your Bike. Our Care.'}</Text>
            </Animated.View>
          )}

        </View>
      </SafeAreaProvider>
    </CartProvider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
  },
  brand: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 2,
    marginTop: 10,
  },
});