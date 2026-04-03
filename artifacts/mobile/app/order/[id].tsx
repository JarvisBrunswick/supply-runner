import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { getOrder, updateOrder } from "@workspace/api-client-react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import Colors from "@/constants/colors";

const C = Colors.light;

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(Number(id)),
    refetchInterval: 15000,
  });

  const { mutate: cancelOrder, isPending } = useMutation({
    mutationFn: () => updateOrder(Number(id), { status: "cancelled" }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPadding = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPadding, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, { paddingTop: topPadding, justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalAmount = typeof order.totalAmount === "string" ? parseFloat(order.totalAmount) : order.totalAmount;
  const canCancel = order.status === "pending";

  const TIMELINE = [
    { status: "pending", label: "Order Placed", icon: "clipboard-check-outline" },
    { status: "accepted", label: "Driver Assigned", icon: "account-check" },
    { status: "picked_up", label: "Materials Picked Up", icon: "truck" },
    { status: "delivered", label: "Delivered", icon: "map-marker-check" },
  ];

  const STATUSES = ["pending", "accepted", "picked_up", "delivered"];
  const currentIdx = STATUSES.indexOf(order.status);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
        <OrderStatusBadge status={order.status} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding + 100 }}>
        <View style={styles.siteCard}>
          <View style={styles.siteHeader}>
            <View style={styles.siteIconContainer}>
              <MaterialCommunityIcons name="map-marker" size={24} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.siteName}>{order.jobSiteName}</Text>
              <Text style={styles.siteAddress}>{order.jobSiteAddress}</Text>
            </View>
          </View>
          {order.deliveryNotes && (
            <View style={styles.notesContainer}>
              <Feather name="info" size={14} color={C.textSecondary} />
              <Text style={styles.notesText}>{order.deliveryNotes}</Text>
            </View>
          )}
        </View>

        {order.status !== "cancelled" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Progress</Text>
            <View style={styles.timeline}>
              {TIMELINE.map((step, idx) => {
                const isCompleted = currentIdx >= idx;
                const isActive = currentIdx === idx;
                return (
                  <View key={step.status} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.timelineDot,
                        isCompleted && styles.timelineDotCompleted,
                        isActive && styles.timelineDotActive,
                      ]}>
                        {isCompleted ? (
                          <Feather name="check" size={12} color="#fff" />
                        ) : (
                          <View style={styles.timelineDotInner} />
                        )}
                      </View>
                      {idx < TIMELINE.length - 1 && (
                        <View style={[styles.timelineLine, isCompleted && currentIdx > idx && styles.timelineLineCompleted]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <MaterialCommunityIcons
                        name={step.icon as any}
                        size={16}
                        color={isCompleted ? (isActive ? C.primary : C.success) : C.textSecondary}
                      />
                      <Text style={[
                        styles.timelineLabel,
                        isCompleted && (isActive ? { color: C.primary } : { color: C.success }),
                      ]}>
                        {step.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemsCard}>
            {(order.items as Array<{ materialName: string; quantity: number; unit: string; pricePerUnit: number; subtotal: number }>).map((item, idx) => (
              <View key={idx}>
                {idx > 0 && <View style={styles.itemDivider} />}
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.materialName}</Text>
                    <Text style={styles.itemQty}>{item.quantity} {item.unit} × ${item.pricePerUnit.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.itemSubtotal}>${item.subtotal.toFixed(2)}</Text>
                </View>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Material Subtotal</Text>
              <Text style={styles.totalAmount}>
                ${order.fees ? order.fees.materialSubtotal.toFixed(2) : totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Fee Breakdown (if fees exist on order) */}
        {order.fees && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Fees</Text>
            <View style={styles.itemsCard}>
              <View style={styles.itemRow}>
                <Text style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary }}>Delivery Fee</Text>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text }}>
                  {order.fees.deliveryDiscount > 0 ? "FREE" : `$${order.fees.baseFee.toFixed(2)}`}
                </Text>
              </View>
              {order.fees.distanceFee > 0 && (
                <>
                  <View style={styles.itemDivider} />
                  <View style={styles.itemRow}>
                    <Text style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary }}>Distance Fee</Text>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text }}>${order.fees.distanceFee.toFixed(2)}</Text>
                  </View>
                </>
              )}
              <View style={styles.itemDivider} />
              <View style={styles.itemRow}>
                <Text style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary }}>Service Fee (5%)</Text>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text }}>${order.fees.serviceFee.toFixed(2)}</Text>
              </View>
              {order.fees.rushFee > 0 && (
                <>
                  <View style={styles.itemDivider} />
                  <View style={styles.itemRow}>
                    <Text style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: C.primary }}>Rush Delivery</Text>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.primary }}>+${order.fees.rushFee.toFixed(2)}</Text>
                  </View>
                </>
              )}
              {order.fees.deliveryDiscount > 0 && (
                <>
                  <View style={styles.itemDivider} />
                  <View style={styles.itemRow}>
                    <Text style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: C.success }}>Large Order Discount</Text>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.success }}>-${order.fees.deliveryDiscount.toFixed(2)}</Text>
                  </View>
                </>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Order Total</Text>
                <Text style={styles.totalAmount}>${order.fees.grandTotal.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {canCancel && (
        <View style={[styles.footer, { paddingBottom: bottomPadding + 16 }]}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => cancelOrder()}
            disabled={isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>
              {isPending ? "Cancelling..." : "Cancel Order"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
    flex: 1,
  },
  siteCard: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  siteHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  siteIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  siteName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  siteAddress: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    marginTop: 2,
  },
  notesContainer: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: C.surfaceSecondary,
    borderRadius: 10,
    padding: 10,
  },
  notesText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  timeline: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    gap: 0,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
  },
  timelineLeft: {
    alignItems: "center",
    width: 24,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.surfaceSecondary,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotCompleted: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  timelineDotActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.border,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: C.border,
    marginVertical: 2,
    minHeight: 24,
  },
  timelineLineCompleted: {
    backgroundColor: C.success,
  },
  timelineContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
  },
  itemsCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 8,
  },
  itemDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 14,
  },
  itemName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  itemQty: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    marginTop: 2,
  },
  itemSubtotal: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surfaceSecondary,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  totalAmount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.background,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  cancelButton: {
    backgroundColor: C.error + "15",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.error,
  },
  errorText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    marginBottom: 12,
  },
  backLink: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.primary,
  },
});
