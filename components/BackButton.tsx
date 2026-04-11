// components/BackButton.tsx
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radius } from '../constants/theme';

type Props = {
    fallback?: string;   // where to go if stack is empty
};

export default function BackButton({ fallback = '/(customer)' }: Props) {
    const router = useRouter();

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace(fallback as any);
        }
    };

    return (
        <TouchableOpacity style={styles.btn} onPress={handleBack} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        width: 36, height: 36,
        borderRadius: Radius.sm,
        backgroundColor: Colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
});