import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_KEY = 'bikeservice_cart';

export type CartItem = {
    cartId: string;       // unique per item
    garageId: string;
    garageName: string;
    garageAddress: string;
    vehicleType: string;       // 'bike' | 'scooty'
    vehicleBrand: string;
    vehicleModel: string;
    vehicleReg: string;
    bikeDetails: string;       // full string for booking payload
    services: string[];     // selected services array
    date: string;       // "YYYY-MM-DD"
    dateLabel: string;       // "Mon, 7 Apr"
    timeDisplay: string;       // "10:00 AM"
    timeRaw: string;       // "1000" for booking payload
    estimatedPrice: number;
    addedAt: string;       // ISO timestamp
};

export type AddToCartPayload = Omit<CartItem, 'cartId' | 'addedAt'>;

export async function getCart(): Promise<CartItem[]> {
    try {
        const raw = await AsyncStorage.getItem(CART_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export async function addToCart(payload: AddToCartPayload): Promise<CartItem> {
    const cart = await getCart();
    const newItem: CartItem = {
        ...payload,
        cartId: Date.now().toString(),
        addedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CART_KEY, JSON.stringify([...cart, newItem]));
    return newItem;
}

export async function removeFromCart(cartId: string): Promise<CartItem[]> {
    const cart = await getCart();
    const updated = cart.filter((item) => item.cartId !== cartId);
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(updated));
    return updated;
}

export async function clearCart(): Promise<void> {
    await AsyncStorage.removeItem(CART_KEY);
}

export async function getCartCount(): Promise<number> {
    const cart = await getCart();
    return cart.length;
}