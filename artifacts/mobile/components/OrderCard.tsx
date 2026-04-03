import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { OrderStatusBadge } from "./OrderStatusBadge";
import Colors from "@/constants/colors";

const C = Colors.light;

interface Order {
  id: number;
  jobSiteName: string;
  jobSiteAddress: string;
  status: string;
  totalAmount: number;
  items: Array<{ materialName: string; quantity: number; unit: string }>;
  createdAt: string;
  driverId?: string | null;
}

interface Props {
  order: Order;
  onPress: () => void;
  showDriver?: boolean;
}

export function OrderCard({ order, onPress, showDriver }: Props) {
  const date = new Date(order.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={styles.siteInfo}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="map-marker" size={18} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.siteName} numberOfLines={1}>{order.jobSiteName}</Text>
            <Text style={styles.address} numberOfLines={1}>{order.jobSiteAddress}</Text>
          </View>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>

      <View style={styles.divider} />

      <View style={styles.itemsRow}>
        <Text style={styles.itemsText} numberOfLines={1}>
          {order.items.map(i => `${i.quantity} ${i.unit} ${i.materialName}`).join(" · ")}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.date}>{formattedDate}</Text>
        <Text style={styles.amount}>${order.totalAmount.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  siteInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primary + "15",
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
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
  },
  itemsRow: {},
  itemsText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  footer: {
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
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
});
