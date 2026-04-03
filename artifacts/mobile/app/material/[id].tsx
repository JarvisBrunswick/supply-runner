import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { getMaterials } from "@workspace/api-client-react";
import { useCart } from "@/context/CartContext";
import Colors from "@/constants/colors";

const C = Colors.light;

const HD_ORANGE = "#F96302";

const CATEGORY_COLORS: Record<string, string> = {
  Electrical: "#F59E0B",
  Plumbing: "#0EA5E9",
  Drywall: "#8B5CF6",
  Solar: "#F97316",
  "Screws & Nails": "#64748B",
  Paint: "#EC4899",
  default: "#6B7280",
};

type MaterialWithHD = {
  id: number;
  name: string;
  description: string;
  unit: string;
  pricePerUnit: number | string;
  category: string;
  imageUrl?: string | null;
  homedepotUrl?: string | null;
  homedepotSku?: string | null;
};

function getHDImageUrl(sku: string): string {
  return `https://images.homedepot-static.com/productImages/${sku}/${sku}_600.jpg`;
}

export default function MaterialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { items, addItem, updateQuantity } = useCart();
  const [qty, setQty] = useState("1");
  const [imgError, setImgError] = useState(false);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: () => getMaterials(),
  });

  const material = materials.find(m => String(m.id) === id) as MaterialWithHD | undefined;
  const cartItem = items.find(i => i.materialId === Number(id));
  const cartQty = cartItem?.quantity ?? 0;
  const pricePerUnit = material ? Number(material.pricePerUnit) : 0;
  const parsedQty = parseInt(qty) || 1;
  const iconColor = material ? (CATEGORY_COLORS[material.category] ?? CATEGORY_COLORS.default) : C.primary;

  const hasHD = !!(material?.homedepotUrl && material?.homedepotSku);
  const hdImageUrl = hasHD ? getHDImageUrl(material!.homedepotSku!) : null;

  function extractSpecs(name: string): string[] {
    const lower = name.toLowerCase();
    const specs: string[] = [];

    const ampMatch = lower.match(/\b(\d+)\s*(-\s*amp|a)\b/);
    if (ampMatch) specs.push(`amp:${ampMatch[1]}`);

    const poleMatch = lower.match(/\b(single[\s-]pole|double[\s-]pole|2[\s-]pole|3[\s-]way|4[\s-]way)\b/);
    if (poleMatch) specs.push(`pole:${poleMatch[1].replace(/[\s-]/g, "")}`);

    const typeKeywords = [
      "gfci", "outlet", "switch", "breaker", "dimmer", "smart",
      "recessed", "led", "flood", "vapor", "shop light", "work light",
      "load center", "junction box", "conduit", "wire",
    ];
    for (const kw of typeKeywords) {
      if (lower.includes(kw)) specs.push(`type:${kw.replace(" ", "")}`);
    }

    return specs;
  }

  function scoreSimilarity(a: string, b: string): number {
    const specsA = extractSpecs(a);
    const specsB = extractSpecs(b);
    return specsA.filter(s => specsB.includes(s)).length;
  }

  const candidateItems = materials.filter(
    m => m.category === material?.category && String(m.id) !== id
  );

  const similarItems = material?.category === "Electrical"
    ? (() => {
        const scored = candidateItems
          .map(m => ({ m, score: scoreSimilarity(material!.name, m.name) }))
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score);
        const result = scored.map(({ m }) => m).slice(0, 8);
        return result.length > 0 ? result : candidateItems.slice(0, 8);
      })()
    : candidateItems.slice(0, 8);

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPadding = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleAddToCart = () => {
    if (!material) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (cartItem) {
      updateQuantity(material.id, cartQty + parsedQty);
    } else {
      addItem({
        materialId: material.id,
        materialName: material.name,
        quantity: parsedQty,
        unit: material.unit,
        pricePerUnit,
      });
    }
    router.back();
  };

  const handleOpenHD = () => {
    if (material?.homedepotUrl) {
      Linking.openURL(material.homedepotUrl);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPadding, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!material) {
    return (
      <View style={[styles.container, { paddingTop: topPadding, justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.errorText}>Material not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{material.name}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding + 120 }}>

        {hasHD && !imgError && (
          <View style={styles.hdImageContainer}>
            <Image
              source={{ uri: hdImageUrl! }}
              style={styles.hdImage}
              resizeMode="contain"
              onError={() => setImgError(true)}
            />
          </View>
        )}

        <View style={[styles.heroSection, { backgroundColor: iconColor + "12" }, hasHD && !imgError && styles.heroNoTopRadius]}>
          <View style={styles.categoryBadge}>
            <View style={[styles.categoryBadgeInner, { backgroundColor: iconColor + "20" }]}>
              <Text style={[styles.categoryLabel, { color: iconColor }]}>{material.category}</Text>
            </View>
            {hasHD && material.homedepotSku && (
              <Text style={styles.skuLabel}>SKU #{material.homedepotSku}</Text>
            )}
          </View>
          <Text style={styles.materialName}>{material.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${pricePerUnit.toFixed(2)}</Text>
            <Text style={styles.priceUnit}>per {material.unit}</Text>
          </View>
        </View>

        {hasHD && (
          <TouchableOpacity style={styles.hdButton} onPress={handleOpenHD} activeOpacity={0.85}>
            <View style={styles.hdLogo}>
              <Text style={styles.hdLogoText}>HD</Text>
            </View>
            <Text style={styles.hdButtonText}>View on The Home Depot</Text>
            <Feather name="external-link" size={16} color={HD_ORANGE} />
          </TouchableOpacity>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>About this item</Text>
          <Text style={styles.description}>{material.description}</Text>
        </View>

        <View style={styles.orderSection}>
          <Text style={styles.orderTitle}>Order Quantity</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyAdjBtn}
              onPress={() => setQty(String(Math.max(1, parsedQty - 1)))}
              activeOpacity={0.7}
            >
              <Feather name="minus" size={20} color={C.text} />
            </TouchableOpacity>
            <TextInput
              style={styles.qtyInput}
              value={qty}
              onChangeText={v => setQty(v.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              textAlign="center"
            />
            <TouchableOpacity
              style={styles.qtyAdjBtn}
              onPress={() => setQty(String(parsedQty + 1))}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalAmount}>${(pricePerUnit * parsedQty).toFixed(2)}</Text>
          </View>
        </View>

        {similarItems.length > 0 && material.category !== "Solar" && (
          <View style={styles.similarSection}>
            <Text style={styles.similarTitle}>Similar Items</Text>
            <FlatList
              data={similarItems}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={styles.similarList}
              ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
              renderItem={({ item }) => {
                const hdItem = item as MaterialWithHD;
                const itemInCart = items.find(i => i.materialId === item.id);
                const itemQty = itemInCart?.quantity ?? 0;
                const itemHasSku = !!hdItem.homedepotSku;
                return (
                  <TouchableOpacity
                    style={styles.similarCard}
                    onPress={() => router.replace({ pathname: "/material/[id]", params: { id: item.id } })}
                    activeOpacity={0.75}
                  >
                    {itemHasSku ? (
                      <Image
                        source={{ uri: getHDImageUrl(hdItem.homedepotSku!) }}
                        style={styles.similarImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={[styles.similarIconBox, { backgroundColor: iconColor + "15" }]}>
                        <Feather name="package" size={22} color={iconColor} />
                      </View>
                    )}
                    <Text style={styles.similarName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.similarPrice}>${Number(item.pricePerUnit).toFixed(2)}</Text>
                    <Text style={styles.similarUnit}>per {item.unit}</Text>
                    {itemQty > 0 && (
                      <View style={styles.similarCartBadge}>
                        <Text style={styles.similarCartBadgeText}>{itemQty} in cart</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPadding + 16 }]}>
        {cartQty > 0 && (
          <Text style={styles.alreadyInCart}>
            {cartQty} {material.unit} already in cart
          </Text>
        )}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddToCart}
          activeOpacity={0.85}
        >
          <Feather name="shopping-cart" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, gap: 12,
  },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: C.text, flex: 1 },

  hdImageContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginHorizontal: 16,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.border,
  },
  hdImage: { width: "90%", height: "90%" },

  heroSection: {
    marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 14, gap: 10,
  },
  heroNoTopRadius: { borderTopLeftRadius: 0, borderTopRightRadius: 0 },

  categoryBadge: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  categoryBadgeInner: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  categoryLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  skuLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },

  materialName: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, letterSpacing: -0.3 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  price: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  priceUnit: { fontSize: 15, fontFamily: "Inter_400Regular", color: C.textSecondary },

  hdButton: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: HD_ORANGE + "40",
    shadowColor: HD_ORANGE, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  hdLogo: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: HD_ORANGE, alignItems: "center", justifyContent: "center",
  },
  hdLogoText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  hdButtonText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },

  infoSection: { paddingHorizontal: 16, marginBottom: 20, gap: 8 },
  sectionLabel: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  description: { fontSize: 15, fontFamily: "Inter_400Regular", color: C.text, lineHeight: 22 },

  orderSection: {
    backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 20,
    padding: 20, gap: 16, marginBottom: 28,
    shadowColor: C.cardShadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  orderTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: C.text },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyAdjBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.surfaceSecondary, alignItems: "center", justifyContent: "center",
  },
  qtyInput: {
    flex: 1, height: 48, backgroundColor: C.surfaceSecondary,
    borderRadius: 14, fontSize: 20, fontFamily: "Inter_600SemiBold", color: C.text,
  },
  subtotalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  subtotalLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: C.textSecondary },
  subtotalAmount: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text },

  similarSection: { gap: 14, marginBottom: 8 },
  similarTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: C.text, paddingHorizontal: 16 },
  similarList: { paddingHorizontal: 16 },
  similarCard: {
    width: 148, backgroundColor: C.surface, borderRadius: 16,
    padding: 14, gap: 6, borderWidth: 1, borderColor: C.border,
  },
  similarImage: { width: "100%", height: 70, borderRadius: 8 },
  similarIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  similarName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text, lineHeight: 18 },
  similarPrice: { fontSize: 15, fontFamily: "Inter_700Bold", color: C.text },
  similarUnit: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textSecondary },
  similarCartBadge: {
    marginTop: 4, backgroundColor: C.primary + "15",
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start",
  },
  similarCartBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.primary },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.background, borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 12, paddingHorizontal: 16, gap: 8,
  },
  alreadyInCart: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary, textAlign: "center" },
  addButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, gap: 10,
  },
  addButtonText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: C.text },
});
