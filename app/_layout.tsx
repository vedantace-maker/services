// app/_layout.tsx

import { useEffect, useRef, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import {
  View, Text, StyleSheet, Animated,
  Dimensions, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { CartProvider } from '../context/CartContext';
import { useNotifications } from '../hooks/useNotifications';
// import { Colors } from '../constants/theme';

const { height } = Dimensions.get('window');

// ── AuthGate ──────────────────────────────────────────────────────────────────
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { user, token, isHydrated } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOwnerGroup = segments[0] === '(owner)';
    const inCustomerGroup = segments[0] === '(customer)';

    if (!token || !user) {
      // ── Not logged in → always go to login ───────────────────────────
      if (!inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
      return;
    }

    // ── Logged in → make sure they are in the RIGHT role group ───────────
    // This fires on cold reopen too, not just after login
    if (user.role === 'owner') {
      if (!inOwnerGroup) {
        router.replace('/(owner)' as any);
      }
    } else {
      if (!inCustomerGroup) {
        router.replace('/(customer)/home' as any);
      }
    }
  }, [isHydrated, token, user]);
  //  ↑ 'segments' intentionally excluded to avoid fighting the router

  return <Slot />;
}

// ── RootLayout ────────────────────────────────────────────────────────────────
export default function RootLayout() {
  const { isHydrated, hydrate } = useAuthStore();
  useNotifications();

  const [showWelcome, setShowWelcome] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ✅ Single hydrate() call — the only source of truth
  useEffect(() => {
    hydrate();
  }, []);

  // ✅ Welcome splash slide-away
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

  // ✅ All hooks declared above — safe to early return here
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
          <AuthGate />

          {showWelcome && (
            <Animated.View
              style={[
                styles.overlay,
                { transform: [{ translateY: slideAnim }] },
              ]}
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

const styles = StyleSheet.create({
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF6B35' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center', zIndex: 999, elevation: 999 },
  brand: { fontSize: 48, fontWeight: 'bold', color: '#fff', letterSpacing: 6 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.75)', letterSpacing: 2, marginTop: 10 },
});