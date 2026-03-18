import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Dimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    visible: boolean;
    message: string;
    type?: ToastType;
    onHide: () => void;
    duration?: number;
}

const CONFIG: Record<ToastType, {
    bg: string; border: string; color: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
}> = {
    success: { bg: Colors.successLight, border: Colors.success, color: '#065F46', icon: 'checkmark-circle' },
    error: { bg: Colors.errorLight, border: Colors.error, color: '#991B1B', icon: 'close-circle' },
    warning: { bg: Colors.warningLight, border: Colors.warning, color: '#92400E', icon: 'warning' },
    info: { bg: Colors.infoLight, border: Colors.info, color: '#1E40AF', icon: 'information-circle' },
};

export default function Toast({
    visible, message, type = 'success', onHide, duration = 3000,
}: ToastProps) {
    const translateY = useRef(new Animated.Value(-80)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;

        // Slide down + fade in
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0, useNativeDriver: true, friction: 8, tension: 80,
            }),
            Animated.timing(opacity, {
                toValue: 1, duration: 250, useNativeDriver: true,
            }),
        ]).start();

        // Auto-dismiss
        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: -80, duration: 300, useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0, duration: 300, useNativeDriver: true,
                }),
            ]).start(() => onHide());
        }, duration);

        return () => clearTimeout(timer);
    }, [visible]);

    if (!visible) return null;

    const cfg = CONFIG[type];

    return (
        <Animated.View
            style={[
                styles.container,
                { backgroundColor: cfg.bg, borderLeftColor: cfg.border },
                { transform: [{ translateY }], opacity },
            ]}
        >
            <Ionicons name={cfg.icon} size={20} color={cfg.border} />
            <Text style={[styles.message, { color: cfg.color }]}>{message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 56,
        left: Spacing.md,
        right: Spacing.md,
        zIndex: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderRadius: Radius.lg,
        borderLeftWidth: 4,
        ...Shadow.lg,
    },
    message: {
        ...Typography.body,
        fontWeight: '500',
        flex: 1,
        lineHeight: 20,
    },
});
