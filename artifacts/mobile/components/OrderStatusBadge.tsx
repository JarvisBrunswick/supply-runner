import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

type Status = "pending" | "accepted" | "picked_up" | "delivered" | "cancelled";

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: string; iconSet: "feather" | "mci" }> = {
  pending: { label: "Pending", color: "#F59E0B", bg: "#FEF3C7", icon: "clock", iconSet: "feather" },
  accepted: { label: "Accepted", color: "#3B82F6", bg: "#DBEAFE", icon: "check-circle", iconSet: "feather" },
  picked_up: { label: "In Transit", color: "#8B5CF6", bg: "#EDE9FE", icon: "truck-fast", iconSet: "mci" },
  delivered: { label: "Delivered", color: "#22C55E", bg: "#DCFCE7", icon: "check-circle", iconSet: "feather" },
  cancelled: { label: "Cancelled", color: "#EF4444", bg: "#FEE2E2", icon: "x-circle", iconSet: "feather" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as Status] ?? STATUS_CONFIG.pending;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      {config.iconSet === "feather" ? (
        <Feather name={config.icon as any} size={12} color={config.color} />
      ) : (
        <MaterialCommunityIcons name={config.icon as any} size={12} color={config.color} />
      )}
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
