import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  TextInput,
  ScrollView,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { createOrder } from "@workspace/api-client-react";
import { useCart } from "@/context/CartContext";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.light;

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, removeItem, updateQuantity, clearCart, totalAmount } = useCart();
  const { user } = useApp();
  const queryClient = useQueryClient();
  const [jobSiteName, setJobSiteName] = useState("");
  const [jobSiteAddress, setJobSiteAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: () =>
      createOrder({
        consumerId: user?.id ?? "",
        jobSiteName,
        jobSiteAddress,
        deliveryNotes: deliveryNotes || undefined,
        items: items.map((i) => ({ materialId: i.materialId, quantity: i.quantity })),
      }),
    onSuccess: (order) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.push({ pathname: "/order/[id]", params: { id: order.id } });
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const canOrder = jobSiteName.trim() && jobSiteAddress.trim() && items.length > 0;

  if (items.length === 0 && !showForm) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Cart</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Feather name="shopping-cart" size={40} color={C.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Browse materials and add them to your cart</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => router.push("/(tabs)")} activeOpacity={0.8}>
            <Text style={styles.browseButtonText}>Browse Materials</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); clearCart(); }}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 120 }}>
        {items.map((item) => (
          <View key={item.materialId} style={styles.cartItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.materialName}</Text>
              <Text style={styles.itemPrice}>${item.pricePerUnit.toFixed(2)} / {item.unit}</Text>
            </View>
            <View style={styles.itemActions}>
              <View style={styles.quantityControl}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateQuantity(item.materialId, item.quantity - 1); }}>
                  <Feather name="minus" size={14} color={C.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateQuantity(item.materialId, item.quantity + 1); }}>
                  <Feather name="plus" size={14} color={C.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.subtotal}>${(item.pricePerUnit * item.quantity).toFixed(2)}</Text>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); removeItem(item.materialId); }}>
                <Feather name="trash-2" size={18} color={C.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalAmount}>${totalAmount.toFixed(2)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Delivery Details</Text>

          <Text style={styles.fieldLabel}>Job Site Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Downtown Tower Block"
            placeholderTextColor={C.textSecondary}
            value={jobSiteName}
            onChangeText={setJobSiteName}
          />

          <Text style={styles.fieldLabel}>Delivery Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Full job site address"
            placeholderTextColor={C.textSecondary}
            value={jobSiteAddress}
            onChangeText={setJobSiteAddress}
          />

          <Text style={styles.fieldLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Special instructions for the driver..."
            placeholderTextColor={C.textSecondary}
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.orderButton, (!canOrder || isPending) && styles.orderButtonDisabled]}
          onPress={() => canOrder && placeOrder()}
          disabled={!canOrder || isPending}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="truck-delivery" size={20} color="#fff" />
          <Text style={styles.orderButtonText}>
            {isPending ? "Placing Order..." : `Place Order · $${totalAmount.toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.5,
  },
  clearText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.error,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    textAlign: "center",
  },
  browseButton: {
    marginTop: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  cartItem: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemInfo: {},
  itemName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  itemPrice: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    minWidth: 20,
    textAlign: "center",
  },
  subtotal: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    flex: 1,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
  },
  totalAmount: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  divider: {
    height: 8,
    backgroundColor: C.surfaceSecondary,
  },
  formSection: {
    padding: 20,
    gap: 6,
  },
  formTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.text,
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  orderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
  },
  orderButtonDisabled: {
    opacity: 0.5,
  },
  orderButtonText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
