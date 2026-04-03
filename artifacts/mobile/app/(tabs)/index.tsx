import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  TextInput,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { Image } from "expo-image";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { getMaterials } from "@workspace/api-client-react";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";
import PlumbingIcon from "@/components/PlumbingIcon";
import ScrewsIcon from "@/components/ScrewsIcon";

const C = Colors.light;

const CATEGORIES = [
  { name: "Electrical & Solar", sub: "Panels, wire & breakers",  icon: "sun",     iconLib: "feather" as const, colors: ["#1E293B", "#0369A1"] as [string, string], logo: require("../../assets/images/squard-d-logo.png"), brandIcon: null },
  { name: "Plumbing",           sub: "Pipes, valves & fittings", icon: "droplet", iconLib: "feather" as const, colors: ["#0F766E", "#059669"] as [string, string], logo: require("../../assets/images/plumbing-logo.png"),           brandIcon: null },
  { name: "Screws & Nails",     sub: "Fasteners & anchors",      icon: "tool",    iconLib: "feather" as const, colors: ["#92400E", "#B45309"] as [string, string], logo: require("../../assets/images/hammer-nail-logo.png"),    brandIcon: null },
  { name: "Paint",              sub: "Interior & exterior",      icon: "bucket",  iconLib: "mci"    as const, colors: ["#581C87", "#7C3AED"] as [string, string], logo: require("../../assets/images/behr-logo.png"),               brandIcon: null },
  { name: "Drywall",            sub: "Sheets, tape & compound",  icon: "layers",  iconLib: "feather" as const, colors: ["#166534", "#15803D"] as [string, string], logo: null,                                                      brandIcon: null },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const [search, setSearch] = React.useState("");

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: () => getMaterials(),
  });

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const searchResults = React.useMemo(() => {
    if (!search.trim()) return [];
    return materials
      .filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 10);
  }, [search, materials]);

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    materials.forEach(m => {
      counts[m.category] = (counts[m.category] ?? 0) + 1;
    });
    return counts;
  }, [materials]);

  const getCategoryCount = (name: string) =>
    name === "Electrical & Solar"
      ? (categoryCounts["Solar"] ?? 0) + (categoryCounts["Electrical"] ?? 0)
      : (categoryCounts[name] ?? 0);

  return (
    <ImageBackground
      source={require("../../assets/images/supply-runner-logo.jpeg")}
      style={styles.container}
      imageStyle={styles.bgImage}
      resizeMode="contain"
    >
      <View style={styles.header}>
        <View style={styles.logoBanner}>
          <View style={styles.logoAccentBar} />
          <View style={styles.logoTruckBox}>
            <Feather name="truck" size={50} color="#F96302" />
            <View style={styles.speedLines}>
              <View style={[styles.speedLine, { width: 18 }]} />
              <View style={[styles.speedLine, { width: 13 }]} />
              <View style={[styles.speedLine, { width: 9 }]} />
            </View>
          </View>
          <View style={styles.logoDivider} />
          <View style={styles.logoTextBlock}>
            <Text style={styles.logoSupply}>SUPPLY</Text>
            <Text style={styles.logoRunner}>RUNNER</Text>
          </View>
        </View>
        <View style={styles.headerBottom}>
          <View style={styles.taglineRow}>
            <Text style={styles.tagline}>On-Demand Supply Chain</Text>
            <Text style={styles.divider}>/</Text>
            <Text style={styles.motto}>You need it. We bring it.</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color={C.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search all materials..."
          placeholderTextColor={C.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={C.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {search.trim() ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {isLoading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
          ) : searchResults.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>Try a different search term</Text>
            </View>
          ) : (
            <View style={styles.searchResultsGroup}>
              {searchResults.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.searchResultRow,
                    index === 0 && styles.rowFirst,
                    index === searchResults.length - 1 && styles.rowLast,
                  ]}
                  onPress={() => router.push({ pathname: "/material/[id]", params: { id: item.id } })}
                  activeOpacity={0.75}
                >
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.searchResultMeta}>{item.category} · ${Number(item.pricePerUnit).toFixed(2)} / {item.unit}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={C.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gridContent}>
          <View style={styles.grid}>
            {CATEGORIES.map(cat => {
              const count = getCategoryCount(cat.name);
              return (
                <TouchableOpacity
                  key={cat.name}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: "/category/[name]", params: { name: cat.name } })}
                  style={styles.card}
                >
                  {cat.logo ? (
                    <View style={styles.cardLogoFill}>
                      <Image source={cat.logo} style={styles.cardLogoFull} contentFit="contain" />
                    </View>
                  ) : cat.brandIcon ? (
                    <View style={styles.cardBrandIconFill}>
                      {(cat as any).svgType === "screws"
                        ? <ScrewsIcon size={cat.brandIcon.size} color={cat.brandIcon.color} />
                        : (cat as any).svgIcon
                          ? <PlumbingIcon size={cat.brandIcon.size} color={cat.brandIcon.color} />
                          : <MaterialCommunityIcons name={cat.brandIcon.name as any} size={cat.brandIcon.size} color={cat.brandIcon.color} />
                      }
                    </View>
                  ) : (
                    <LinearGradient
                      colors={cat.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardIconArea}
                    >
                      {cat.iconLib === "mci"
                        ? <MaterialCommunityIcons name={cat.icon as any} size={32} color="white" />
                        : <Feather name={cat.icon as any} size={32} color="white" />
                      }
                    </LinearGradient>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName} numberOfLines={2}>{cat.name}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>{cat.sub}</Text>
                    <Text style={styles.cardCount}>{count} items</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  bgImage: { opacity: 0.06, width: "90%", alignSelf: "center", top: "20%" },
  header: { marginBottom: 8 },
  logoBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 20,
    gap: 12, borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  logoAccentBar: { width: 5, height: 56, backgroundColor: "#F96302", borderRadius: 3 },
  logoTruckBox: { alignItems: "center" },
  speedLines: { gap: 2, alignItems: "flex-start", marginTop: 2, alignSelf: "flex-start", marginLeft: 4 },
  speedLine: { height: 2, backgroundColor: "#F96302", borderRadius: 2 },
  logoDivider: { width: 1.5, height: 52, backgroundColor: "#E2E8F0" },
  logoTextBlock: { gap: 0 },
  logoSupply: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#1A1A1A", letterSpacing: -0.5, lineHeight: 32 },
  logoRunner: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#F96302", letterSpacing: -0.5, lineHeight: 32 },
  headerBottom: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 2 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary },
  taglineRow: { flexDirection: "row", alignItems: "center", flexWrap: "nowrap", gap: 5, marginBottom: 4 },
  tagline: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#F96302", letterSpacing: 0.5, textTransform: "uppercase" },
  divider: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#94A3B8" },
  motto: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#000000", letterSpacing: 0.5, textTransform: "uppercase" },
  searchContainer: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
    gap: 8, borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text },
  gridContent: { paddingHorizontal: 14, paddingBottom: 100, paddingTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47.5%", backgroundColor: "#fff", borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09, shadowRadius: 6, elevation: 3,
  },
  cardIconArea: {
    height: 110, overflow: "hidden",
  },
  cardLogoFill: {
    height: 110, backgroundColor: "white",
    alignItems: "center", justifyContent: "center",
    padding: 4,
  },
  cardBrandIconFill: {
    height: 110, backgroundColor: "white",
    alignItems: "center", justifyContent: "center",
  },
  cardLogoFull: {
    width: "100%", height: "100%",
  },
  cardBody: { padding: 12, gap: 2 },
  cardName: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#1A1A1A", letterSpacing: -0.2 },
  cardSub:  { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textSecondary },
  cardCount: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.primary, marginTop: 4 },
  rowFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14, borderTopWidth: 1 },
  rowLast:  { borderBottomLeftRadius: 14, borderBottomRightRadius: 14, borderBottomWidth: 1 },
  searchResultsGroup: { marginHorizontal: 16 },
  searchResultRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: C.surface, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border, gap: 12,
  },
  searchResultInfo: { flex: 1, gap: 3 },
  searchResultName: { fontSize: 15, fontFamily: "Inter_500Medium", color: C.text },
  searchResultMeta: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text },
  emptyText:  { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary },
});
