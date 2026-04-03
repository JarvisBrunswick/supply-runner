import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCart } from "@/context/CartContext";
import Colors from "@/constants/colors";

const C = Colors.light;

interface Material {
  id: number;
  name: string;
  description: string;
  unit: string;
  pricePerUnit: number;
  category: string;
}

interface Props {
  material: Material;
  onPress: () => void;
}

export function MaterialCard({ material, onPress }: Props) {
  const { items, addItem, updateQuantity } = useCart();

  const cartItem = items.find((i) => i.materialId === material.id);
  const quantity = cartItem?.quantity ?? 0;

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem({
      materialId: material.id,
      materialName: material.name,
      quantity: 1,
      unit: material.unit,
      pricePerUnit: material.pricePerUnit,
    });
  };

  const handleIncrease = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateQuantity(material.id, quantity + 1);
  };

  const handleDecrease = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateQuantity(material.id, quantity - 1);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{material.name}</Text>
        <Text style={styles.meta}>{material.category} · ${material.pricePerUnit.toFixed(2)} / {material.unit}</Text>
      </View>

      {quantity === 0 ? (
        <TouchableOpacity style={styles.addButton} onPress={handleAdd} activeOpacity={0.8}>
          <Feather name="plus" size={16} color={C.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.quantityControl}>
          <TouchableOpacity onPress={handleDecrease} activeOpacity={0.7} style={styles.qtyBtn}>
            <Feather name="minus" size={13} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity onPress={handleIncrease} activeOpacity={0.7} style={styles.qtyBtn}>
            <Feather name="plus" size={13} color={C.text} />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
    gap: 12,
  },
  left: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },
  meta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  qtyBtn: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    minWidth: 18,
    textAlign: "center",
  },
});
