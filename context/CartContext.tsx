import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    CartItem, AddToCartPayload,
    getCart, addToCart as addToCartStorage,
    removeFromCart as removeFromCartStorage,
    clearCart as clearCartStorage,
} from '../utils/services/cartService';

type CartContextType = {
    items: CartItem[];
    addItem: (payload: AddToCartPayload) => Promise<void>;
    removeItem: (cartId: string) => Promise<void>;
    clearCart: () => Promise<void>;
    loading: boolean;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Load on mount
    useEffect(() => {
        getCart().then(setItems).finally(() => setLoading(false));
    }, []);

    const addItem = useCallback(async (payload: AddToCartPayload) => {
        const newItem = await addToCartStorage(payload);
        setItems((prev) => [newItem, ...prev]);
    }, []);

    const removeItem = useCallback(async (cartId: string) => {
        const updated = await removeFromCartStorage(cartId);
        setItems(updated);
    }, []);

    const clearCart = useCallback(async () => {
        await clearCartStorage();
        setItems([]);
    }, []);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, clearCart, loading }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used inside CartProvider');
    return ctx;
}