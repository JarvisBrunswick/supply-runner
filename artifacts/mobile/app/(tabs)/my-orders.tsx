import React, { useState } from "react";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { getOrders } from "@workspace/api-client-react";
import { OrderCard } from "@/components/OrderCard";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.light;

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "picked_up", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
];

export default function MyOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const [activeStatus, setActiveStatus] = useState("");

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["orders", "consumer", user?.id, activeStatus],
    queryFn: () =>
      getOrders({ role: "consumer", userId: user?.id, status: activeStatus || undefined }),
    enabled: !!user,
  });

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>

      <FlatList
        horizontal
        data={STATUS_TABS}
        keyExtractor={t => t.key}
        showsHorizontalScrollIndicator={false}
        style={styles.tabList}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item: tab }) => (
          <TouchableOpacity
            style={[styles.tab, activeStatus === tab.key && styles.tabActive]}
            onPress={() => setActiveStatus(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeStatus === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={orders}
        keyExtractor={o => String(o.id)}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.primary} />}
        ListHeaderComponent={
          <>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={48} color={C.textSecondary} />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>Your orders will appear here once placed</Text>
            </View>
          ) : null
        }
        renderItem={({ item: order }) => (
          <OrderCard
            order={{ ...order, totalAmount: Number(order.totalAmount) }}
            onPress={() => router.push({ pathname: "/order/[id]", params: { id: order.id } })}
          />
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.5,
  },
  tabList: {
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
  },
  tabTextActive: {
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
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
