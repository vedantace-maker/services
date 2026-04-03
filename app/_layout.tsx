import { useEffect, useRef, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import {
  View, Text, StyleSheet, Animated,
  Dimensions, StatusBar, ActivityIndicator
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { getStoredUser } from '../utils/dummyAuth';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from '../context/CartContext';
import { useNotifications } from '../hooks/useNotifications';

const { height } = Dimensions.get('window');
;

export default function RootLayout() {
  useNotifications();
  const { user, setUser } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  // const [activeIndex, setActiveIndex] = useState<number>(0);
  const segments = useSegments();
  const router = useRouter();

  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Load stored user ───────────────────────────────────────────────
  useEffect(() => {
    getStoredUser().then((storedUser) => {
      if (storedUser) setUser(storedUser);
      setInitialized(true);
    });
  }, []);

  // ── Slide away welcome after 2.2s ──────────────────────────────────
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

  // ── Auth redirect ──────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user) {
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else if (inAuthGroup) {
      router.replace(user.role === 'customer' ? '/(customer)/home' : '/(owner)');
    }
  }, [user, initialized, segments]);

  if (!initialized) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <CartProvider>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          {/* App content always renders underneath */}
          <Slot />

          {/* Welcome overlay slides away on every app open */}
          {showWelcome ? (
            <Animated.View
              style={[
                styles.overlay,
                { transform: [{ translateY: slideAnim }] }
              ]}
            >
              <StatusBar barStyle="light-content" backgroundColor="#FF6B35" />
              <Text style={styles.brand}>MOTOBEE</Text>
              <Text style={styles.tagline}>Your Bike. Our Care.</Text>
            </Animated.View>
          ) : null}
        </View>
      </SafeAreaProvider>
    </CartProvider>
  );
}

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
