import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const C = Colors.light;

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? "";

type ScanResult = "idle" | "loading" | "match" | "mismatch" | "unknown";

async function lookupBarcode(barcode: string) {
  const res = await fetch(`${BASE_URL}/api/materials/barcode/${encodeURIComponent(barcode)}`, {
    headers: { "x-api-key": API_KEY },
  });
  if (!res.ok) return null;
  return res.json();
}

export default function DriverScanVerifyScreen() {
  const insets = useSafeAreaInsets();
  const { orderItems, orderId } = useLocalSearchParams<{ orderItems: string; orderId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanResult>("idle");
  const [scannedName, setScannedName] = useState<string>("");
  const [expectedName, setExpectedName] = useState<string>("");
  const [verifiedItems, setVerifiedItems] = useState<Set<number>>(new Set());

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const parsedItems: Array<{ materialId: number; materialName: string; quantity: number }> =
    orderItems ? JSON.parse(orderItems) : [];

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (scanState === "loading") return;
    setScanState("loading");
    setScannedName("");
    setExpectedName("");

    const material = await lookupBarcode(data);

    if (!material) {
      setScanState("unknown");
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
      setTimeout(() => setScanState("idle"), 3000);
      return;
    }

    const matchedItem = parsedItems.find(item => item.materialId === material.id);

    if (matchedItem) {
      setScanState("match");
      setScannedName(material.name);
      setExpectedName(matchedItem.materialName);
      setVerifiedItems(prev => new Set([...prev, material.id]));
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } else {
      setScanState("mismatch");
      setScannedName(material.name);
      setExpectedName(parsedItems.map(i => i.materialName).join(", "));
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }

    setTimeout(() => setScanState("idle"), 3500);
  };

  if (!permission) {
    return (
      <View style={[styles.center, { paddingTop: topPadding }]}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { paddingTop: topPadding }]}>
        <View style={styles.permissionBox}>
          <View style={styles.permIconWrap}>
            <Feather name="camera" size={36} color={C.primary} />
          </View>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSub}>
            Allow camera access to verify picked items
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Enable Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS !== "web" ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={scanState === "idle" ? handleBarcodeScan : undefined}
          barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.webCamera]}>
          <Text style={styles.webCameraText}>Camera not available on web</Text>
        </View>
      )}

      <View style={[styles.overlay, { paddingTop: topPadding }]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Verify Items</Text>
          <View style={{ width: 40 }} />
        </View>

        {parsedItems.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.itemsBar}
            style={styles.itemsScroll}
          >
            {parsedItems.map(item => {
              const verified = verifiedItems.has(item.materialId);
              return (
                <View
                  key={item.materialId}
                  style={[styles.itemChip, verified && styles.itemChipVerified]}
                >
                  <Feather
                    name={verified ? "check-circle" : "package"}
                    size={14}
                    color={verified ? "#22C55E" : "rgba(255,255,255,0.7)"}
                  />
                  <Text style={[styles.itemChipText, verified && styles.itemChipTextVerified]} numberOfLines={1}>
                    {item.materialName} × {item.quantity}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          {scanState === "loading" && (
            <View style={styles.statusBubble}>
              <ActivityIndicator color="white" size="small" />
              <Text style={styles.statusText}>Verifying item…</Text>
            </View>
          )}

          {scanState === "match" && (
            <View style={[styles.statusBubble, styles.matchBubble]}>
              <Feather name="check-circle" size={18} color="white" />
              <Text style={styles.statusText}>Correct! {scannedName}</Text>
            </View>
          )}

          {scanState === "mismatch" && (
            <View style={[styles.statusBubble, styles.mismatchBubble]}>
              <Feather name="x-circle" size={18} color="white" />
              <View>
                <Text style={styles.statusText}>Wrong item: {scannedName}</Text>
                <Text style={styles.statusSubText}>Check the order list above</Text>
              </View>
            </View>
          )}

          {scanState === "unknown" && (
            <View style={[styles.statusBubble, styles.unknownBubble]}>
              <Feather name="help-circle" size={18} color="white" />
              <Text style={styles.statusText}>Barcode not recognized</Text>
            </View>
          )}
        </View>

        <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}>
          {verifiedItems.size > 0 && verifiedItems.size === parsedItems.length && (
            <View style={styles.allVerifiedBanner}>
              <Feather name="check-circle" size={16} color="#22C55E" />
              <Text style={styles.allVerifiedText}>All {parsedItems.length} items verified!</Text>
            </View>
          )}
          <Text style={styles.hintText}>
            {scanState === "idle"
              ? `Point camera at an item barcode to verify`
              : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.background },
  webCamera: { backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  webCameraText: { color: "#888", fontSize: 15 },
  permissionBox: {
    alignItems: "center", gap: 12, padding: 32,
    backgroundColor: C.surface, borderRadius: 24, marginHorizontal: 32,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  permIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.primary + "18", alignItems: "center", justifyContent: "center",
  },
  permTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center" },
  permSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary, textAlign: "center" },
  permBtn: { backgroundColor: C.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  permBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "white" },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between" },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center",
  },
  topTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "white" },
  itemsScroll: { maxHeight: 60, flexGrow: 0 },
  itemsBar: { flexDirection: "row", paddingHorizontal: 16, gap: 8, alignItems: "center" },
  itemChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7, maxWidth: 200,
  },
  itemChipVerified: { backgroundColor: "rgba(34,197,94,0.25)" },
  itemChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  itemChipTextVerified: { color: "#22C55E" },
  scanArea: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  scanFrame: { width: 260, height: 200, position: "relative" },
  corner: { position: "absolute", width: CORNER_SIZE, height: CORNER_SIZE, borderColor: "white" },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 6 },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 6 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 6 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 6 },
  statusBubble: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  matchBubble: { backgroundColor: "rgba(34,197,94,0.85)" },
  mismatchBubble: { backgroundColor: "rgba(220,50,50,0.85)" },
  unknownBubble: { backgroundColor: "rgba(100,100,100,0.85)" },
  statusText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "white" },
  statusSubText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  bottomSection: { alignItems: "center", gap: 10 },
  allVerifiedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(34,197,94,0.2)", borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  allVerifiedText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#22C55E" },
  hintText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
});
