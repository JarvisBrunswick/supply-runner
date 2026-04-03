import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@workspace/api-client-react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.light;

export default function DeliveryHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: delivered = [], isLoading: l1, refetch: r1, isRefetching: r1f } = useQuery({
    queryKey: ["orders", "driver", "delivered", user?.id],
    queryFn: () => getOrders({ role: "driver", userId: user?.id, status: "delivered" }),
    enabled: !!user,
  });

  const { data: cancelled = [], isLoading: l2, refetch: r2, isRefetching: r2f } = useQuery({
    queryKey: ["orders", "driver", "cancelled", user?.id],
    queryFn: () => getOrders({ role: "driver", userId: user?.id, status: "cancelled" }),
    enabled: !!user,
  });

  const isLoading = l1 || l2;
  const isRefetching = r1f || r2f;
  const refetch = () => { r1(); r2(); };

  const history = [...delivered, ...cancelled].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const totalEarnings = delivered.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {delivered.length > 0 && (
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          <Text style={styles.earningsAmount}>${totalEarnings.toFixed(2)}</Text>
          <Text style={styles.earningsCount}>{delivered.length} deliveries completed</Text>
        </View>
      )}

      <FlatList
        data={history}
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
              <MaterialCommunityIcons name="history" size={56} color={C.textSecondary} />
              <Text style={styles.emptyTitle}>No history yet</Text>
              <Text style={styles.emptyText}>Completed deliveries will appear here</Text>
            </View>
          ) : null
        }
        renderItem={({ item: order }) => {
          const date = new Date(order.updatedAt);
          const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          return (
            <View style={styles.historyCard}>
              <View style={styles.cardTop}>
                <View style={styles.siteInfo}>
                  <Text style={styles.siteName} numberOfLines={1}>{order.jobSiteName}</Text>
                  <Text style={styles.address} numberOfLines={1}>{order.jobSiteAddress}</Text>
                </View>
                <OrderStatusBadge status={order.status} />
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.date}>{formatted}</Text>
                <Text style={styles.amount}>${Number(order.totalAmount).toFixed(2)}</Text>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.5,
  },
  earningsCard: {
    backgroundColor: C.success,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    gap: 4,
  },
  earningsLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  earningsAmount: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -1,
  },
  earningsCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  loadingContainer: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
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
  historyCard: {
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
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  address: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  amount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
});
