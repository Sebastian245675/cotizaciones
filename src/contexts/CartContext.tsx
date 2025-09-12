
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  additionalImages?: string[];
  specifications?: { name: string; value: string }[];
  category: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryName?: string;
  terceraCategoria?: string;
  terceraCategoriaName?: string;
  stock: number;
  isOffer?: boolean;
  discount?: number;
  originalPrice?: number;
  benefits?: string[];
  warranties?: string[];
  paymentMethods?: string[];
  colors?: { name: string; hexCode: string; image: string }[];
}

export interface CartItem extends Product {
  quantity: number;
  selectedColor?: { name: string; hexCode: string; image: string };
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedColor?: { name: string; hexCode: string; image: string }) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    // Cargar carrito desde localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setItems(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    // Guardar carrito en localStorage cuando cambie
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number = 1, selectedColor?: { name: string; hexCode: string; image: string }) => {
    setItems(prevItems => {
      // If there's a selected color, we need to check if that specific product+color combination exists
      if (selectedColor) {
        const existingItemWithColor = prevItems.find(
          item => item.id === product.id && 
                  item.selectedColor?.name === selectedColor.name
        );
        
        if (existingItemWithColor) {
          // If the same product with same color exists, update quantity
          return prevItems.map(item =>
            item.id === product.id && item.selectedColor?.name === selectedColor.name
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          // Add new item with the selected color
          return [...prevItems, { ...product, quantity, selectedColor }];
        }
      } else {
        // Handle products without color selection (original behavior)
        const existingItem = prevItems.find(
          item => item.id === product.id && !item.selectedColor
        );
        
        if (existingItem) {
          return prevItems.map(item =>
            item.id === product.id && !item.selectedColor
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          return [...prevItems, { ...product, quantity }];
        }
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
