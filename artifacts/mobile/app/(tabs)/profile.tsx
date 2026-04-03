import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.light;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useApp();
  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleSignOut = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await setUser(null);
    router.replace("/");
  };

  const initials = user?.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2) ?? "?";

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPadding }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 100 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <View style={styles.roleBadge}>
          <MaterialCommunityIcons name="hard-hat" size={14} color={C.primary} />
          <Text style={styles.roleText}>Site Manager</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionCard}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: C.primary + "15" }]}>
              <Feather name="user" size={18} color={C.primary} />
            </View>
            <Text style={styles.menuLabel}>Name</Text>
            <Text style={styles.menuValue}>{user?.name}</Text>
          </View>
          <View style={styles.itemDivider} />
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: "#6366F115" }]}>
              <MaterialCommunityIcons name="identifier" size={18} color="#6366F1" />
            </View>
            <Text style={styles.menuLabel}>ID</Text>
            <Text style={styles.menuValue} numberOfLines={1}>
              {user?.id?.substring(0, 16)}...
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/(tabs)/my-orders")} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: "#F59E0B15" }]}>
              <Feather name="list" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.menuLabel}>My Orders</Text>
            <Feather name="chevron-right" size={18} color={C.textSecondary} />
          </TouchableOpacity>
          <View style={styles.itemDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/(tabs)")} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: "#22C55E15" }]}>
              <MaterialCommunityIcons name="package-variant" size={18} color="#22C55E" />
            </View>
            <Text style={styles.menuLabel}>Browse Materials</Text>
            <Feather name="chevron-right" size={18} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Feather name="log-out" size={18} color={C.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.5,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  userName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.primary + "15",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.primary,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.text,
    flex: 1,
  },
  menuValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    maxWidth: 160,
  },
  itemDivider: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 62,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: C.error + "15",
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.error,
  },
});
