import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const C = Colors.light;

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? "";

type Mode = "barcode" | "photo";

type PhotoResult = {
  identified: boolean;
  materialName?: string;
  category?: string;
  confidence?: string;
  description?: string;
  matches?: Array<{
    id: number;
    name: string;
    pricePerUnit: number;
    unit: string;
    category: string;
    homedepotSku?: string;
  }>;
};

async function lookupBarcode(barcode: string) {
  const res = await fetch(`${BASE_URL}/api/materials/barcode/${encodeURIComponent(barcode)}`, {
    headers: { "x-api-key": API_KEY },
  });
  if (!res.ok) return null;
  return res.json();
}

async function identifyPhoto(imageBase64: string): Promise<PhotoResult> {
  const res = await fetch(`${BASE_URL}/api/materials/identify-photo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!res.ok) throw new Error("Failed to identify");
  return res.json();
}

function getHDImageUrl(sku: string) {
  return `https://images.homedepot-static.com/productImages/${sku}/${sku}_600.jpg`;
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [mode, setMode] = useState<Mode>("barcode");

  const [barcodeScanned, setBarcodeScanned] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeNotFound, setBarcodeNotFound] = useState(false);

  const [photoCapturing, setPhotoCapturing] = useState(false);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoResult, setPhotoResult] = useState<PhotoResult | null>(null);

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPadding = insets.bottom + (Platform.OS === "web" ? 100 : 90);

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (barcodeScanned || barcodeLoading) return;
    setBarcodeScanned(true);
    setBarcodeLoading(true);
    setBarcodeNotFound(false);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}

    const material = await lookupBarcode(data);
    if (material) {
      router.push({ pathname: "/material/[id]", params: { id: material.id } });
      setTimeout(() => { setBarcodeScanned(false); setBarcodeLoading(false); }, 1500);
    } else {
      setBarcodeLoading(false);
      setBarcodeNotFound(true);
      setTimeout(() => { setBarcodeScanned(false); setBarcodeNotFound(false); }, 2500);
    }
  };

  const handleTakePhoto = async () => {
    if (photoCapturing || photoAnalyzing || !cameraRef.current) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setPhotoCapturing(true);
    setPhotoResult(null);

    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
    setPhotoCapturing(false);

    if (!photo?.base64) return;
    setPhotoPreview(photo.uri ?? null);
    setPhotoAnalyzing(true);

    try {
      const result = await identifyPhoto(photo.base64);
      setPhotoResult(result);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch {
      setPhotoResult({ identified: false, description: "Could not reach the server. Try again." });
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    } finally {
      setPhotoAnalyzing(false);
    }
  };

  const resetPhoto = () => {
    setPhotoPreview(null);
    setPhotoResult(null);
    setPhotoAnalyzing(false);
    setPhotoCapturing(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    resetPhoto();
    setBarcodeScanned(false);
    setBarcodeNotFound(false);
    setBarcodeLoading(false);
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
            Allow camera access to scan barcodes or identify materials with AI
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Enable Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const showCamera = Platform.OS !== "web";
  const showPhotoPreview = mode === "photo" && photoPreview && (photoAnalyzing || photoResult);

  return (
    <View style={styles.container}>
      {showCamera && !showPhotoPreview ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={mode === "barcode" && !barcodeScanned ? handleBarcodeScan : undefined}
          barcodeScannerSettings={
            mode === "barcode"
              ? { barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] }
              : undefined
          }
        />
      ) : showPhotoPreview ? (
        <Image
          source={{ uri: photoPreview! }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.webCamera]}>
          <Feather name="camera-off" size={48} color="#555" />
          <Text style={styles.webCameraText}>Camera not available on web</Text>
        </View>
      )}

      {showPhotoPreview && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.dimOverlay} />
        </View>
      )}

      <View style={[styles.overlay, { paddingTop: topPadding }]}>
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>
            {mode === "barcode" ? "Scan Material" : "Identify Material"}
          </Text>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "barcode" && styles.modeBtnActive]}
              onPress={() => switchMode("barcode")}
            >
              <Feather name="maximize" size={14} color={mode === "barcode" ? "white" : "rgba(255,255,255,0.6)"} />
              <Text style={[styles.modeBtnText, mode === "barcode" && styles.modeBtnTextActive]}>Barcode</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "photo" && styles.modeBtnActive]}
              onPress={() => switchMode("photo")}
            >
              <Feather name="cpu" size={14} color={mode === "photo" ? "white" : "rgba(255,255,255,0.6)"} />
              <Text style={[styles.modeBtnText, mode === "photo" && styles.modeBtnTextActive]}>AI Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {mode === "barcode" && (
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            {barcodeLoading && (
              <View style={styles.statusBubble}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.statusText}>Looking up material…</Text>
              </View>
            )}
            {barcodeNotFound && !barcodeLoading && (
              <View style={[styles.statusBubble, styles.errorBubble]}>
                <Feather name="alert-circle" size={16} color="white" />
                <Text style={styles.statusText}>No material found for this barcode</Text>
              </View>
            )}
          </View>
        )}

        {mode === "photo" && !showPhotoPreview && (
          <View style={styles.scanArea}>
            <View style={styles.photoHintBox}>
              <Feather name="cpu" size={28} color="rgba(255,255,255,0.8)" />
              <Text style={styles.photoHintTitle}>AI Material Recognition</Text>
              <Text style={styles.photoHintText}>Point at any construction material and take a photo — AI will identify it and find matches</Text>
            </View>
          </View>
        )}

        {mode === "photo" && showPhotoPreview && (
          <View style={styles.scanArea}>
            {photoAnalyzing && (
              <View style={styles.analyzingBox}>
                <ActivityIndicator color="white" size="large" />
                <Text style={styles.analyzingText}>AI is identifying the material…</Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.bottomSection, { paddingBottom: bottomPadding }]}>
          {mode === "barcode" && (
            <>
              <Text style={styles.hintText}>Point at any material barcode</Text>
              {barcodeScanned && !barcodeLoading && !barcodeNotFound && (
                <TouchableOpacity style={styles.rescanBtn} onPress={() => setBarcodeScanned(false)}>
                  <Text style={styles.rescanText}>Tap to scan again</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {mode === "photo" && !showPhotoPreview && (
            <TouchableOpacity
              style={[styles.captureBtn, photoCapturing && styles.captureBtnActive]}
              onPress={handleTakePhoto}
              disabled={photoCapturing}
              activeOpacity={0.85}
            >
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
          )}

          {mode === "photo" && showPhotoPreview && !photoAnalyzing && photoResult && (
            <TouchableOpacity style={styles.retakeBtn} onPress={resetPhoto}>
              <Feather name="refresh-cw" size={16} color="white" />
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {mode === "photo" && photoResult && !photoAnalyzing && (
        <View style={[styles.resultsPanel, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) }]}>
          <View style={styles.resultsPanelHandle} />

          {!photoResult.identified ? (
            <View style={styles.noMatchBox}>
              <Feather name="alert-circle" size={24} color={C.textSecondary} />
              <Text style={styles.noMatchTitle}>Couldn't identify material</Text>
              <Text style={styles.noMatchText}>{photoResult.description}</Text>
            </View>
          ) : (
            <>
              <View style={styles.aiIdentRow}>
                <View style={styles.aiBadge}>
                  <Feather name="cpu" size={12} color="white" />
                  <Text style={styles.aiBadgeText}>AI</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiMaterialName}>{photoResult.materialName}</Text>
                  <Text style={styles.aiDesc} numberOfLines={2}>{photoResult.description}</Text>
                </View>
                {photoResult.confidence && (
                  <View style={[styles.confBadge, photoResult.confidence === "high" && styles.confHigh, photoResult.confidence === "medium" && styles.confMed]}>
                    <Text style={styles.confText}>{photoResult.confidence}</Text>
                  </View>
                )}
              </View>

              {photoResult.matches && photoResult.matches.length > 0 ? (
                <>
                  <Text style={styles.matchesLabel}>
                    {photoResult.matches.length} match{photoResult.matches.length !== 1 ? "es" : ""} in inventory
                  </Text>
                  <ScrollView showsVerticalScrollIndicator={false} style={styles.matchesList}>
                    {photoResult.matches.map((m, i) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.matchRow, i < photoResult.matches!.length - 1 && styles.matchRowBorder]}
                        onPress={() => router.push({ pathname: "/material/[id]", params: { id: m.id } })}
                        activeOpacity={0.75}
                      >
                        {m.homedepotSku ? (
                          <Image
                            source={{ uri: getHDImageUrl(m.homedepotSku) }}
                            style={styles.matchThumb}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={[styles.matchThumb, styles.matchThumbIcon]}>
                            <Feather name="package" size={20} color={C.textSecondary} />
                          </View>
                        )}
                        <View style={styles.matchInfo}>
                          <Text style={styles.matchName} numberOfLines={1}>{m.name}</Text>
                          <Text style={styles.matchMeta}>{m.category} · ${Number(m.pricePerUnit).toFixed(2)}/{m.unit}</Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={C.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              ) : (
                <View style={styles.noMatchBox}>
                  <Text style={styles.noMatchTitle}>No matching items in inventory</Text>
                  <Text style={styles.noMatchText}>We identified "{photoResult.materialName}" but it's not currently stocked</Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.background, paddingHorizontal: 32 },
  webCamera: { backgroundColor: "#111", alignItems: "center", justifyContent: "center", gap: 12 },
  webCameraText: { color: "#aaa", fontSize: 16, fontFamily: "Inter_500Medium" },
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  permissionBox: {
    alignItems: "center", gap: 12, padding: 32, backgroundColor: C.surface,
    borderRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  permIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: C.primary + "18", alignItems: "center", justifyContent: "center" },
  permTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center" },
  permSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary, textAlign: "center" },
  permBtn: { backgroundColor: C.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  permBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "white" },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between" },
  topBar: { alignItems: "center", gap: 14, paddingBottom: 8 },
  topTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "white" },
  modeToggle: {
    flexDirection: "row", backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20, padding: 3, gap: 2,
  },
  modeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 17 },
  modeBtnActive: { backgroundColor: C.primary },
  modeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)" },
  modeBtnTextActive: { color: "white", fontFamily: "Inter_600SemiBold" },

  scanArea: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  scanFrame: { width: 260, height: 180, position: "relative" },
  corner: { position: "absolute", width: CORNER_SIZE, height: CORNER_SIZE, borderColor: "white" },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 6 },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 6 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 6 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 6 },

  statusBubble: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  errorBubble: { backgroundColor: "rgba(220,50,50,0.85)" },
  statusText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "white" },

  photoHintBox: { alignItems: "center", gap: 12, paddingHorizontal: 40 },
  photoHintTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "white" },
  photoHintText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", textAlign: "center", lineHeight: 19 },

  analyzingBox: { alignItems: "center", gap: 16 },
  analyzingText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "white" },

  bottomSection: { alignItems: "center", gap: 12 },
  hintText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)" },
  rescanBtn: { backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  rescanText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "white" },
  captureBtn: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 4, borderColor: "white",
    alignItems: "center", justifyContent: "center",
  },
  captureBtnActive: { borderColor: "rgba(255,255,255,0.4)" },
  captureBtnInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: "white" },
  retakeBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 11,
  },
  retakeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "white" },

  resultsPanel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
    maxHeight: "55%",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
  },
  resultsPanelHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: "center", marginBottom: 16,
  },
  aiIdentRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  aiBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  aiBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "white" },
  aiMaterialName: { fontSize: 16, fontFamily: "Inter_700Bold", color: C.text },
  aiDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary, marginTop: 2, lineHeight: 18 },
  confBadge: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: "#64748B20",
  },
  confHigh: { backgroundColor: "#22C55E20" },
  confMed: { backgroundColor: "#F59E0B20" },
  confText: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.textSecondary },
  matchesLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textSecondary, marginBottom: 8 },
  matchesList: { flexGrow: 0 },
  matchRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12,
  },
  matchRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  matchThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: C.surfaceSecondary },
  matchThumbIcon: { alignItems: "center", justifyContent: "center" },
  matchInfo: { flex: 1, gap: 3 },
  matchName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  matchMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },
  noMatchBox: { alignItems: "center", gap: 8, paddingVertical: 20 },
  noMatchTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text },
  noMatchText: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary, textAlign: "center", lineHeight: 18 },
});
