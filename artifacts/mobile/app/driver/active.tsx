import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { getOrders, updateOrder } from "@workspace/api-client-react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.light;

export default function ActiveDeliveriesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const queryClient = useQueryClient();

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: acceptedOrders = [], isLoading: l1, refetch: r1, isRefetching: r1f } = useQuery({
    queryKey: ["orders", "driver", "accepted", user?.id],
    queryFn: () => getOrders({ role: "driver", userId: user?.id, status: "accepted" }),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: pickedUpOrders = [], isLoading: l2, refetch: r2, isRefetching: r2f } = useQuery({
    queryKey: ["orders", "driver", "picked_up", user?.id],
    queryFn: () => getOrders({ role: "driver", userId: user?.id, status: "picked_up" }),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const isLoading = l1 || l2;
  const isRefetching = r1f || r2f;
  const refetch = () => { r1(); r2(); };
  const allActive = [...acceptedOrders, ...pickedUpOrders];

  const { mutate: advanceOrder, isPending } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateOrder(id, { status }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const getNextAction = (status: string) => {
    if (status === "accepted") return { label: "Mark Picked Up", nextStatus: "picked_up", color: "#8B5CF6", icon: "truck" };
    if (status === "picked_up") return { label: "Mark Delivered", nextStatus: "delivered", color: C.success, icon: "map-marker-check" };
    return null;
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Active Deliveries</Text>
        {allActive.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{allActive.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={allActive}
        keyExtractor={o => String(o.id)}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.success} />}
        ListHeaderComponent={isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.success} />
          </View>
        ) : null}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="truck-outline" size={56} color={C.textSecondary} />
              <Text style={styles.emptyTitle}>No active deliveries</Text>
              <Text style={styles.emptyText}>Accept an order from Available tab to start delivering</Text>
            </View>
          ) : null
        }
        renderItem={({ item: order }) => {
          const action = getNextAction(order.status);
          return (
            <View style={[styles.card, order.status === "picked_up" && styles.cardInTransit]}>
              <View style={styles.cardHeader}>
                <View style={styles.siteInfo}>
                  <View style={[styles.statusIcon, order.status === "picked_up" && styles.statusIconActive]}>
                    <MaterialCommunityIcons
                      name={order.status === "picked_up" ? "truck-fast" : "truck"}
                      size={20}
                      color={order.status === "picked_up" ? "#8B5CF6" : "#3B82F6"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.siteName} numberOfLines={1}>{order.jobSiteName}</Text>
                    <Text style={styles.address} numberOfLines={1}>{order.jobSiteAddress}</Text>
                  </View>
                </View>
                <OrderStatusBadge status={order.status} />
              </View>

              <View style={styles.divider} />

              <View style={styles.itemsList}>
                {(order.items as Array<{ materialName: string; quantity: number; unit: string }>).map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <MaterialCommunityIcons name="package-variant" size={14} color={C.textSecondary} />
                    <Text style={styles.itemText}>{item.quantity} {item.unit} {item.materialName}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.orderAmount}>${Number(order.totalAmount).toFixed(2)}</Text>
                <View style={styles.footerActions}>
                  {order.status === "accepted" && (
                    <TouchableOpacity
                      style={styles.scanButton}
                      onPress={() => router.push({
                        pathname: "/driver/scan-verify",
                        params: {
                          orderId: String(order.id),
                          orderItems: JSON.stringify(
                            (order.items as Array<{ materialId: number; materialName: string; quantity: number; unit: string }>)
                              .map(i => ({ materialId: i.materialId, materialName: i.materialName, quantity: i.quantity }))
                          ),
                        },
                      })}
                      activeOpacity={0.85}
                    >
                      <Feather name="camera" size={15} color="#3B82F6" />
                      <Text style={styles.scanButtonText}>Verify</Text>
                    </TouchableOpacity>
                  )}
                  {action && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: action.color }]}
                      onPress={() => advanceOrder({ id: order.id, status: action.nextStatus })}
                      disabled={isPending}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name={action.icon as any} size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>{action.label}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={<View style={{ height: Platform.OS === "web" ? 100 : 100 }} />}
      />
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.5,
    flex: 1,
  },
  countBadge: {
    backgroundColor: C.success,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  loadingContainer: {
    paddingTop: 80,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 40,
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
  card: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardInTransit: {
    borderColor: "#8B5CF640",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  siteInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#3B82F615",
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconActive: {
    backgroundColor: "#8B5CF615",
  },
  siteName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  address: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
  },
  itemsList: {
    gap: 6,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderAmount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#3B82F615",
    borderWidth: 1,
    borderColor: "#3B82F630",
  },
  scanButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#3B82F6",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
