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
import { getOrders, updateOrder } from "@workspace/api-client-react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.light;

export default function AvailableOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const queryClient = useQueryClient();

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["orders", "driver", "available"],
    queryFn: () => getOrders({ status: "pending" }),
    refetchInterval: 30000,
  });

  const { mutate: acceptOrder, isPending: isAccepting } = useMutation({
    mutationFn: (orderId: number) =>
      updateOrder(orderId, { status: "accepted", driverId: user?.id }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Ready to deliver,</Text>
          <Text style={styles.title}>{user?.name?.split(" ")[0]}</Text>
        </View>
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={o => String(o.id)}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.success} />}
        ListHeaderComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.success} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="truck-check" size={56} color={C.textSecondary} />
              <Text style={styles.emptyTitle}>No available orders</Text>
              <Text style={styles.emptyText}>New orders will appear here. Pull to refresh.</Text>
            </View>
          ) : null
        }
        renderItem={({ item: order }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.siteInfo}>
                <View style={styles.siteIconWrap}>
                  <MaterialCommunityIcons name="map-marker" size={20} color={C.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.siteName} numberOfLines={1}>{order.jobSiteName}</Text>
                  <Text style={styles.address} numberOfLines={1}>{order.jobSiteAddress}</Text>
                </View>
              </View>
              <Text style={styles.amount}>${Number(order.totalAmount).toFixed(2)}</Text>
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

            {order.deliveryNotes && (
              <View style={styles.notesRow}>
                <Feather name="info" size={13} color={C.textSecondary} />
                <Text style={styles.notesText} numberOfLines={2}>{order.deliveryNotes}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.acceptButton, isAccepting && styles.acceptButtonDisabled]}
              onPress={() => acceptOrder(order.id)}
              disabled={isAccepting}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="truck-delivery" size={18} color="#fff" />
              <Text style={styles.acceptButtonText}>Accept Delivery</Text>
            </TouchableOpacity>
          </View>
        )}
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.5,
  },
  onlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#22C55E15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.success,
  },
  onlineText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.success,
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
  siteIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#22C55E15",
    alignItems: "center",
    justifyContent: "center",
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
  amount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.text,
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
  notesRow: {
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
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.success,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
