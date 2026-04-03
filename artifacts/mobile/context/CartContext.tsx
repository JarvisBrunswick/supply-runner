import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from "react";

export interface CartItem {
  materialId: number;
  materialName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (materialId: number) => void;
  updateQuantity: (materialId: number, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.materialId === item.materialId);
      if (existing) {
        return prev.map((i) =>
          i.materialId === item.materialId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
  };

  const removeItem = (materialId: number) => {
    setItems((prev) => prev.filter((i) => i.materialId !== materialId));
  };

  const updateQuantity = (materialId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(materialId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.materialId === materialId ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalAmount = useMemo(
    () => items.reduce((sum, i) => sum + i.pricePerUnit * i.quantity, 0),
    [items]
  );

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQuantity, clearCart, totalAmount, totalItems }),
    [items, totalAmount, totalItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
