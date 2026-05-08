import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface CartItem {
  id: string | number;
  name: string;
  price: number;
  original_price?: number;
  image: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeFromCart: (productId: string | number) => void;
  updateQuantity: (productId: string | number, type: 'inc' | 'dec') => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('charles-cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart from localStorage', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('charles-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Omit<CartItem, 'quantity'>, quantity: number) => {
    // Registro de evento en base de datos
    const sessionId = sessionStorage.getItem('shop_session_id');
    if (sessionId) {
      supabase.from('cart_events').insert([{
        session_id: sessionId,
        product_id: product.id,
        product_name: product.name
      }]).then(({ error }) => {
        if (error) console.error('Error tracking cart event:', error);
      });
    }

    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.id === product.id);
      if (existingItem) {
        return currentCart.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...currentCart, { ...product, quantity }];
    });
    setIsCartOpen(true); // Open cart when adding item
  };

  const removeFromCart = (productId: string | number) => {
    setCart(currentCart => currentCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string | number, type: 'inc' | 'dec') => {
    setCart(currentCart => currentCart.map(item => {
      if (item.id === productId) {
        const newQty = type === 'inc' ? item.quantity + 1 : item.quantity - 1;
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleCart = () => setIsCartOpen(!isCartOpen);

  const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalPrice,
      totalItems,
      isCartOpen,
      setIsCartOpen,
      toggleCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
