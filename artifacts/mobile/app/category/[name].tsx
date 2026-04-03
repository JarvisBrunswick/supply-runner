import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { getMaterials } from "@workspace/api-client-react";
import { MaterialCard } from "@/components/MaterialCard";
import Colors from "@/constants/colors";

const C = Colors.light;

const PAINT_COLORS: { label: string; swatch: string; keywords: string[] }[] = [
  { label: "White",       swatch: "#F5F5F0", keywords: ["white"] },
  { label: "Gray",        swatch: "#9CA3AF", keywords: ["gray", "grey", "charcoal"] },
  { label: "Beige",       swatch: "#D4B896", keywords: ["beige"] },
  { label: "Blue",        swatch: "#3B82F6", keywords: ["blue"] },
  { label: "Green",       swatch: "#22C55E", keywords: ["green"] },
  { label: "Terracotta",  swatch: "#C2622D", keywords: ["terracotta"] },
  { label: "Black",       swatch: "#1F2937", keywords: ["black"] },
  { label: "Primer",      swatch: "#E5E7EB", keywords: ["primer"] },
  { label: "Accessories", swatch: "#F97316", keywords: ["roller", "kit", "masonry", "concrete"] },
];

const SCREW_SIZES: { label: string; keywords: string[] }[] = [
  { label: '1"',    keywords: ['1"'] },
  { label: '1.5"',  keywords: ['1.5"', '1-1/2', '1 1/2'] },
  { label: '1.75"', keywords: ['1.75"', '1-3/4', '1 3/4'] },
  { label: '2"',    keywords: ['2"', 'x 2"'] },
  { label: '2.5"',  keywords: ['2.5"', '2-1/2', '2 1/2'] },
  { label: '3"',    keywords: ['3"', 'x 3"'] },
  { label: '3.5"',  keywords: ['3.5"', '3-1/2', '3 1/2'] },
  { label: '4"',    keywords: ['4"', 'x 4"'] },
  { label: '5"',    keywords: ['5"', 'x 5"'] },
];

const SOLAR_SUBCATS: { label: string; icon: string; color: string; keywords: string[] }[] = [
  { label: "Lags",        icon: "tool",    color: "#64748B", keywords: ["lag bolt"] },
  { label: "Panels",      icon: "sun",     color: "#F97316", keywords: ["solar panel", "panel"] },
  { label: "Wire",        icon: "zap",     color: "#EAB308", keywords: ["cable", "wire", "awg"] },
  { label: "Accessories", icon: "package", color: "#6366F1", keywords: ["splice", "flashing", "lug", "mc4", "connector", "rail kit", "storage", "conduit body"] },
];

const ELECTRICAL_SUBCATS: { label: string; icon: string; color: string; keywords: string[] }[] = [
  { label: "Breakers",                    icon: "toggle-left", color: "#EF4444", keywords: ["breaker"] },
  { label: "Wire",                        icon: "zap",         color: "#F59E0B", keywords: ["wire", "awg", "nm-b", "cable"] },
  { label: "Conduit",                     icon: "minus",       color: "#64748B", keywords: ["conduit"] },
  { label: "Electrical & Breaker Boxes",  icon: "inbox",       color: "#0EA5E9", keywords: ["load center", "disconnect box", "meter main", "junction box", "electrical box", "old work", "new construction", "square", "octagonal", "weatherproof electrical"] },
  { label: "Outlets, Switches & Lights",  icon: "sun",         color: "#EAB308", keywords: ["outlet", "switch", "light", "gfci", "receptacle", "dimmer", "lamp holder", "flood light", "shop light", "vapor", "recessed", "work light"] },
];

function getAwgSortValue(name: string): number {
  if (/1\/0\s*AWG/i.test(name)) return 0;
  const match = name.match(/^(\d+)\s*AWG/i);
  if (match) return parseInt(match[1], 10);
  return 999;
}

const BREAKER_BRANDS = ["Generic", "Siemens", "Eaton", "Square D"];
const BREAKER_AMPS  = ["15A", "20A", "30A", "40A", "50A", "60A"];

function getBreakerAmp(name: string): number {
  const m = name.match(/(\d+)A/i);
  return m ? parseInt(m[1], 10) : 999;
}

const WIRE_GAUGES = ["14 AWG", "12 AWG", "10 AWG", "8 AWG", "6 AWG", "4 AWG", "2 AWG", "1/0 AWG"];
const WIRE_TYPES  = ["Romex (NM-B)", "THWN-2", "Southwire"];

function matchesWireGauge(name: string, gauge: string): boolean {
  if (gauge === "1/0 AWG") return /1\/0/i.test(name);
  const g = gauge.replace(" AWG", "");
  return new RegExp(`(^|[^\\d])${g}[\\s/]`, "i").test(name);
}

function matchesWireType(name: string, type: string): boolean {
  if (type === "Romex (NM-B)") return /nm-b|romex/i.test(name);
  if (type === "THWN-2")       return /thwn/i.test(name);
  if (type === "Southwire")    return /southwire/i.test(name);
  return false;
}

type SolarElecTab = "Solar" | "Electrical";

export default function CategoryScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const insets = useSafeAreaInsets();
  const isSolarElec = name === "Electrical & Solar";

  const [search, setSearch] = useState("");
  const [solarElecTab, setSolarElecTab] = useState<SolarElecTab>("Electrical");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedSolar, setSelectedSolar] = useState<string | null>(null);
  const [selectedElectrical, setSelectedElectrical] = useState<string | null>(null);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [sizeModalVisible, setSizeModalVisible] = useState(false);
  const [breakerBrand, setBreakerBrand] = useState<string | null>(null);
  const [breakerAmp, setBreakerAmp] = useState<string | null>(null);
  const [brandModalVisible, setBrandModalVisible] = useState(false);
  const [ampModalVisible, setAmpModalVisible] = useState(false);
  const [wireGauge, setWireGauge] = useState<string | null>(null);
  const [wireType, setWireType] = useState<string | null>(null);
  const [wireGaugeModalVisible, setWireGaugeModalVisible] = useState(false);
  const [wireTypeModalVisible, setWireTypeModalVisible] = useState(false);

  const { data: materials = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["materials"],
    queryFn: () => getMaterials(),
  });

  // Show subcategory pickers when no subcat selected and no active search
  const showSolarPicker = isSolarElec && solarElecTab === "Solar" && !selectedSolar && !search.trim();
  const showElectricalPicker = isSolarElec && solarElecTab === "Electrical" && !selectedElectrical && !search.trim();
  const showPicker = showSolarPicker || showElectricalPicker;

  const filtered = useMemo(() => {
    if (showPicker) return [];
    const results = materials.filter(m => {
      const matchesSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase());

      let matchesCat = false;
      if (isSolarElec) {
        matchesCat = m.category === solarElecTab;
      } else {
        matchesCat = m.category === name;
      }

      const nameLower = m.name.toLowerCase();
      const matchesColor =
        !selectedColor ||
        PAINT_COLORS.find(c => c.label === selectedColor)?.keywords.some(k => nameLower.includes(k));
      const matchesSize =
        !selectedSize ||
        SCREW_SIZES.find(s => s.label === selectedSize)?.keywords.some(k => nameLower.includes(k.toLowerCase()));
      const matchesSolar =
        !selectedSolar ||
        SOLAR_SUBCATS.find(s => s.label === selectedSolar)?.keywords.some(k => nameLower.includes(k.toLowerCase()));
      const matchesElectrical =
        !selectedElectrical ||
        ELECTRICAL_SUBCATS.find(s => s.label === selectedElectrical)?.keywords.some(k => nameLower.includes(k.toLowerCase()));

      const matchesBreakerBrand =
        selectedElectrical !== "Breakers" || !breakerBrand ||
        (breakerBrand === "Generic"
          ? !/siemens|eaton|square\s*d/i.test(m.name)
          : m.name.toLowerCase().includes(breakerBrand.toLowerCase()));
      const matchesBreakerAmp =
        selectedElectrical !== "Breakers" || !breakerAmp ||
        m.name.toLowerCase().includes(breakerAmp.toLowerCase());
      const matchesWireGaugeFilter =
        selectedElectrical !== "Wire" || !wireGauge || matchesWireGauge(m.name, wireGauge);
      const matchesWireTypeFilter =
        selectedElectrical !== "Wire" || !wireType || matchesWireType(m.name, wireType);

      return matchesSearch && matchesCat && matchesColor && matchesSize && matchesSolar && matchesElectrical && matchesBreakerBrand && matchesBreakerAmp && matchesWireGaugeFilter && matchesWireTypeFilter;
    });

    if (selectedElectrical === "Breakers") {
      return results.sort((a, b) => getBreakerAmp(a.name) - getBreakerAmp(b.name));
    }
    if (selectedElectrical === "Wire") {
      return results.sort((a, b) => getAwgSortValue(b.name) - getAwgSortValue(a.name));
    }
    return results;
  }, [materials, search, name, isSolarElec, solarElecTab, selectedColor, selectedSize, selectedSolar, selectedElectrical, breakerBrand, breakerAmp, wireGauge, wireType, showPicker]);

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPadding = insets.bottom;
  const activeColor = PAINT_COLORS.find(c => c.label === selectedColor);

  // Count items per solar subcat
  const solarCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SOLAR_SUBCATS.forEach(sub => {
      counts[sub.label] = materials.filter(m => {
        if (m.category !== "Solar") return false;
        const nl = m.name.toLowerCase();
        return sub.keywords.some(k => nl.includes(k.toLowerCase()));
      }).length;
    });
    return counts;
  }, [materials]);

  // Count items per electrical subcat
  const electricalCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ELECTRICAL_SUBCATS.forEach(sub => {
      counts[sub.label] = materials.filter(m => {
        if (m.category !== "Electrical") return false;
        const nl = m.name.toLowerCase();
        return sub.keywords.some(k => nl.includes(k.toLowerCase()));
      }).length;
    });
    return counts;
  }, [materials]);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (selectedSolar) { setSelectedSolar(null); }
            else if (selectedElectrical) { setSelectedElectrical(null); setBreakerBrand(null); setBreakerAmp(null); setWireGauge(null); setWireType(null); }
            else { router.back(); }
          }}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {selectedSolar ?? selectedElectrical ?? name}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color={C.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${selectedSolar ?? name}...`}
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

      {/* Solar / Electrical tab switcher */}
      {isSolarElec && (
        <View style={styles.subTabRow}>
          {(["Electrical", "Solar"] as SolarElecTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.subTab, solarElecTab === tab && styles.subTabActive]}
              onPress={() => { setSolarElecTab(tab); setSelectedSolar(null); setSelectedElectrical(null); setSearch(""); }}
              activeOpacity={0.75}
            >
              <Feather name={tab === "Solar" ? "sun" : "zap"} size={14}
                color={solarElecTab === tab ? C.primary : C.textSecondary} />
              <Text style={[styles.subTabText, solarElecTab === tab && styles.subTabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Paint color filter */}
      {name === "Paint" && (
        <TouchableOpacity style={styles.filterBtn} onPress={() => setColorModalVisible(true)} activeOpacity={0.75}>
          <Feather name="sliders" size={14} color={selectedColor ? C.primary : C.textSecondary} />
          {activeColor && (
            <View style={[styles.dropdownSwatch, { backgroundColor: activeColor.swatch },
              (activeColor.label === "White" || activeColor.label === "Primer") && styles.dropdownSwatchBorder]} />
          )}
          <Text style={[styles.filterBtnText, selectedColor && styles.filterBtnTextActive]}>
            {selectedColor ?? "Filter by color"}
          </Text>
          <Feather name="chevron-down" size={14} color={C.textSecondary} />
          {selectedColor && (
            <TouchableOpacity onPress={() => setSelectedColor(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color={C.primary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}

      {/* Screws size filter */}
      {name === "Screws & Nails" && (
        <TouchableOpacity style={styles.filterBtn} onPress={() => setSizeModalVisible(true)} activeOpacity={0.75}>
          <Feather name="maximize-2" size={14} color={selectedSize ? C.primary : C.textSecondary} />
          <Text style={[styles.filterBtnText, selectedSize && styles.filterBtnTextActive]}>
            {selectedSize ? `Size: ${selectedSize}` : "Filter by size"}
          </Text>
          <Feather name="chevron-down" size={14} color={C.textSecondary} />
          {selectedSize && (
            <TouchableOpacity onPress={() => setSelectedSize(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color={C.primary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}

      {/* Breaker brand + amp filters */}
      {selectedElectrical === "Breakers" && (
        <View style={styles.breakerFilterRow}>
          <TouchableOpacity style={[styles.breakerFilterBtn, breakerBrand && styles.breakerFilterBtnActive]} onPress={() => setBrandModalVisible(true)} activeOpacity={0.75}>
            <Feather name="tag" size={13} color={breakerBrand ? C.primary : C.textSecondary} />
            <Text style={[styles.breakerFilterText, breakerBrand && styles.breakerFilterTextActive]} numberOfLines={1}>
              {breakerBrand ?? "Brand"}
            </Text>
            <Feather name="chevron-down" size={13} color={C.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.breakerFilterBtn, breakerAmp && styles.breakerFilterBtnActive]} onPress={() => setAmpModalVisible(true)} activeOpacity={0.75}>
            <Feather name="zap" size={13} color={breakerAmp ? C.primary : C.textSecondary} />
            <Text style={[styles.breakerFilterText, breakerAmp && styles.breakerFilterTextActive]} numberOfLines={1}>
              {breakerAmp ?? "Amperage"}
            </Text>
            <Feather name="chevron-down" size={13} color={C.textSecondary} />
          </TouchableOpacity>
          {(breakerBrand || breakerAmp) && (
            <TouchableOpacity style={styles.breakerClearBtn} onPress={() => { setBreakerBrand(null); setBreakerAmp(null); }} activeOpacity={0.75}>
              <Feather name="x" size={14} color={C.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Wire gauge + type filters */}
      {selectedElectrical === "Wire" && (
        <View style={styles.breakerFilterRow}>
          <TouchableOpacity style={[styles.breakerFilterBtn, wireGauge && styles.breakerFilterBtnActive]} onPress={() => setWireGaugeModalVisible(true)} activeOpacity={0.75}>
            <Feather name="maximize-2" size={13} color={wireGauge ? C.primary : C.textSecondary} />
            <Text style={[styles.breakerFilterText, wireGauge && styles.breakerFilterTextActive]} numberOfLines={1}>
              {wireGauge ?? "Gauge"}
            </Text>
            <Feather name="chevron-down" size={13} color={C.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.breakerFilterBtn, wireType && styles.breakerFilterBtnActive]} onPress={() => setWireTypeModalVisible(true)} activeOpacity={0.75}>
            <Feather name="tag" size={13} color={wireType ? C.primary : C.textSecondary} />
            <Text style={[styles.breakerFilterText, wireType && styles.breakerFilterTextActive]} numberOfLines={1}>
              {wireType ?? "Type / Brand"}
            </Text>
            <Feather name="chevron-down" size={13} color={C.textSecondary} />
          </TouchableOpacity>
          {(wireGauge || wireType) && (
            <TouchableOpacity style={styles.breakerClearBtn} onPress={() => { setWireGauge(null); setWireType(null); }} activeOpacity={0.75}>
              <Feather name="x" size={14} color={C.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Solar subcategory picker */}
      {showSolarPicker && !isLoading && (
        <FlatList
          data={SOLAR_SUBCATS}
          keyExtractor={item => item.label}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.subcatList}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.subcatRow,
                index === 0 && styles.rowFirst,
                index === SOLAR_SUBCATS.length - 1 && styles.rowLast,
              ]}
              onPress={() => setSelectedSolar(item.label)}
              activeOpacity={0.7}
            >
              <View style={[styles.subcatIconBox, { backgroundColor: item.color + "18" }]}>
                <Feather name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.subcatInfo}>
                <Text style={styles.subcatLabel}>{item.label}</Text>
                <Text style={styles.subcatCount}>{solarCounts[item.label] ?? 0} items</Text>
              </View>
              <Feather name="chevron-right" size={16} color={C.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Electrical subcategory picker */}
      {showElectricalPicker && !isLoading && (
        <FlatList
          data={ELECTRICAL_SUBCATS}
          keyExtractor={item => item.label}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.subcatList}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.subcatRow,
                index === 0 && styles.rowFirst,
                index === ELECTRICAL_SUBCATS.length - 1 && styles.rowLast,
              ]}
              onPress={() => setSelectedElectrical(item.label)}
              activeOpacity={0.7}
            >
              <View style={[styles.subcatIconBox, { backgroundColor: item.color + "18" }]}>
                <Feather name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.subcatInfo}>
                <Text style={styles.subcatLabel}>{item.label}</Text>
                <Text style={styles.subcatCount}>{electricalCounts[item.label] ?? 0} items</Text>
              </View>
              <Feather name="chevron-right" size={16} color={C.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      )}

      {/* Material list */}
      {!showPicker && !isLoading && (
        <SectionList
          sections={[{ title: name, data: filtered.map(m => ({ ...m, pricePerUnit: Number(m.pricePerUnit) })) }]}
          keyExtractor={item => String(item.id)}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.primary} />}
          renderSectionHeader={() => null}
          renderItem={({ item, index, section }) => (
            <View style={[
              styles.rowWrapper,
              index === 0 && styles.rowFirst,
              index === section.data.length - 1 && styles.rowLast,
            ]}>
              <MaterialCard
                material={item}
                onPress={() => router.push({ pathname: "/material/[id]", params: { id: item.id } })}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="package" size={40} color={C.border} />
              <Text style={styles.emptyTitle}>No items found</Text>
              <Text style={styles.emptyText}>Try adjusting your search or filter</Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: bottomPadding + 100 }} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Paint color modal */}
      <Modal visible={colorModalVisible} transparent animationType="fade" onRequestClose={() => setColorModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setColorModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Color</Text>
              <TouchableOpacity onPress={() => setColorModalVisible(false)} style={styles.modalClose}>
                <Feather name="x" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            {selectedColor && (
              <TouchableOpacity style={styles.clearRow} onPress={() => { setSelectedColor(null); setColorModalVisible(false); }} activeOpacity={0.7}>
                <Feather name="refresh-ccw" size={14} color={C.primary} />
                <Text style={styles.clearText}>Clear filter</Text>
              </TouchableOpacity>
            )}
            {PAINT_COLORS.map((color, i) => {
              const isSelected = selectedColor === color.label;
              return (
                <TouchableOpacity key={color.label} style={[styles.modalOption, i < PAINT_COLORS.length - 1 && styles.optionBorder]}
                  onPress={() => { setSelectedColor(isSelected ? null : color.label); setColorModalVisible(false); }} activeOpacity={0.7}>
                  <View style={[styles.optionSwatch, { backgroundColor: color.swatch },
                    (color.label === "White" || color.label === "Primer") && styles.optionSwatchBorder]} />
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{color.label}</Text>
                  {isSelected && <Feather name="check" size={16} color={C.primary} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Screw size modal */}
      <Modal visible={sizeModalVisible} transparent animationType="fade" onRequestClose={() => setSizeModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSizeModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Size</Text>
              <TouchableOpacity onPress={() => setSizeModalVisible(false)} style={styles.modalClose}>
                <Feather name="x" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            {selectedSize && (
              <TouchableOpacity style={styles.clearRow} onPress={() => { setSelectedSize(null); setSizeModalVisible(false); }} activeOpacity={0.7}>
                <Feather name="refresh-ccw" size={14} color={C.primary} />
                <Text style={styles.clearText}>Clear filter</Text>
              </TouchableOpacity>
            )}
            {SCREW_SIZES.map((size, i) => {
              const isSelected = selectedSize === size.label;
              return (
                <TouchableOpacity key={size.label} style={[styles.modalOption, i < SCREW_SIZES.length - 1 && styles.optionBorder]}
                  onPress={() => { setSelectedSize(isSelected ? null : size.label); setSizeModalVisible(false); }} activeOpacity={0.7}>
                  <View style={styles.sizeBox}>
                    <Text style={styles.sizeBoxText}>{size.label}</Text>
                  </View>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{size.label} length</Text>
                  {isSelected && <Feather name="check" size={16} color={C.primary} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Breaker brand modal */}
      <Modal visible={brandModalVisible} transparent animationType="fade" onRequestClose={() => setBrandModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setBrandModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Brand</Text>
              <TouchableOpacity onPress={() => setBrandModalVisible(false)} style={styles.modalClose}>
                <Feather name="x" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            {breakerBrand && (
              <TouchableOpacity style={styles.clearRow} onPress={() => { setBreakerBrand(null); setBrandModalVisible(false); }} activeOpacity={0.7}>
                <Feather name="refresh-ccw" size={14} color={C.primary} />
                <Text style={styles.clearText}>Clear filter</Text>
              </TouchableOpacity>
            )}
            {BREAKER_BRANDS.map((brand, i) => {
              const isSelected = breakerBrand === brand;
              return (
                <TouchableOpacity key={brand} style={[styles.modalOption, i < BREAKER_BRANDS.length - 1 && styles.optionBorder]}
                  onPress={() => { setBreakerBrand(isSelected ? null : brand); setBrandModalVisible(false); }} activeOpacity={0.7}>
                  <Feather name="tag" size={18} color={isSelected ? C.primary : C.textSecondary} />
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{brand}</Text>
                  {isSelected && <Feather name="check" size={16} color={C.primary} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Breaker amperage modal */}
      <Modal visible={ampModalVisible} transparent animationType="fade" onRequestClose={() => setAmpModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAmpModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Amperage</Text>
              <TouchableOpacity onPress={() => setAmpModalVisible(false)} style={styles.modalClose}>
                <Feather name="x" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            {breakerAmp && (
              <TouchableOpacity style={styles.clearRow} onPress={() => { setBreakerAmp(null); setAmpModalVisible(false); }} activeOpacity={0.7}>
                <Feather name="refresh-ccw" size={14} color={C.primary} />
                <Text style={styles.clearText}>Clear filter</Text>
              </TouchableOpacity>
            )}
            {BREAKER_AMPS.map((amp, i) => {
              const isSelected = breakerAmp === amp;
              return (
                <TouchableOpacity key={amp} style={[styles.modalOption, i < BREAKER_AMPS.length - 1 && styles.optionBorder]}
                  onPress={() => { setBreakerAmp(isSelected ? null : amp); setAmpModalVisible(false); }} activeOpacity={0.7}>
                  <View style={styles.sizeBox}>
                    <Text style={styles.sizeBoxText}>{amp}</Text>
                  </View>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{amp}</Text>
                  {isSelected && <Feather name="check" size={16} color={C.primary} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Wire gauge modal */}
      <Modal visible={wireGaugeModalVisible} transparent animationType="fade" onRequestClose={() => setWireGaugeModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setWireGaugeModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Gauge</Text>
              <TouchableOpacity onPress={() => setWireGaugeModalVisible(false)} style={styles.modalClose}>
                <Feather name="x" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            {wireGauge && (
              <TouchableOpacity style={styles.clearRow} onPress={() => { setWireGauge(null); setWireGaugeModalVisible(false); }} activeOpacity={0.7}>
                <Feather name="refresh-ccw" size={14} color={C.primary} />
                <Text style={styles.clearText}>Clear filter</Text>
              </TouchableOpacity>
            )}
            {WIRE_GAUGES.map((gauge, i) => {
              const isSelected = wireGauge === gauge;
              return (
                <TouchableOpacity key={gauge} style={[styles.modalOption, i < WIRE_GAUGES.length - 1 && styles.optionBorder]}
                  onPress={() => { setWireGauge(isSelected ? null : gauge); setWireGaugeModalVisible(false); }} activeOpacity={0.7}>
                  <View style={styles.sizeBox}>
                    <Text style={styles.sizeBoxText}>{gauge.replace(" AWG", "")}</Text>
                  </View>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{gauge}</Text>
                  {isSelected && <Feather name="check" size={16} color={C.primary} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Wire type / brand modal */}
      <Modal visible={wireTypeModalVisible} transparent animationType="fade" onRequestClose={() => setWireTypeModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setWireTypeModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Type / Brand</Text>
              <TouchableOpacity onPress={() => setWireTypeModalVisible(false)} style={styles.modalClose}>
                <Feather name="x" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            {wireType && (
              <TouchableOpacity style={styles.clearRow} onPress={() => { setWireType(null); setWireTypeModalVisible(false); }} activeOpacity={0.7}>
                <Feather name="refresh-ccw" size={14} color={C.primary} />
                <Text style={styles.clearText}>Clear filter</Text>
              </TouchableOpacity>
            )}
            {WIRE_TYPES.map((type, i) => {
              const isSelected = wireType === type;
              return (
                <TouchableOpacity key={type} style={[styles.modalOption, i < WIRE_TYPES.length - 1 && styles.optionBorder]}
                  onPress={() => { setWireType(isSelected ? null : type); setWireTypeModalVisible(false); }} activeOpacity={0.7}>
                  <Feather name="tag" size={18} color={isSelected ? C.primary : C.textSecondary} />
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{type}</Text>
                  {isSelected && <Feather name="check" size={16} color={C.primary} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 14, gap: 10,
  },
  backButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: C.text, letterSpacing: -0.4, flex: 1 },
  searchContainer: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    gap: 8, borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text },
  subTabRow: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.surfaceSecondary, borderRadius: 12, padding: 4, gap: 4,
  },
  subTab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 8, borderRadius: 9, gap: 6,
  },
  subTabActive: { backgroundColor: C.surface, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  subTabText: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.textSecondary },
  subTabTextActive: { color: C.primary, fontFamily: "Inter_600SemiBold" },
  filterBtn: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    gap: 8, borderWidth: 1, borderColor: C.border,
  },
  dropdownSwatch: { width: 16, height: 16, borderRadius: 8 },
  dropdownSwatchBorder: { borderWidth: 1, borderColor: C.border },
  filterBtnText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary },
  filterBtnTextActive: { fontFamily: "Inter_500Medium", color: C.text },
  breakerFilterRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 14, gap: 8 },
  breakerFilterBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9,
    borderWidth: 1, borderColor: C.border,
  },
  breakerFilterBtnActive: { borderColor: C.primary },
  breakerFilterText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary },
  breakerFilterTextActive: { fontFamily: "Inter_500Medium", color: C.primary },
  breakerClearBtn: {
    width: 36, alignItems: "center", justifyContent: "center",
    backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border,
  },

  // Solar subcategory picker
  subcatList: { paddingTop: 4, paddingBottom: 100 },
  subcatRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16,
    backgroundColor: C.surface, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border,
    marginHorizontal: 16, gap: 14,
  },
  subcatIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  subcatInfo: { flex: 1, gap: 3 },
  subcatLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text },
  subcatCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary },

  // Material list
  listContent: { paddingTop: 4 },
  rowWrapper: {
    marginHorizontal: 16, backgroundColor: C.surface, overflow: "hidden",
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border,
  },
  rowFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14, borderTopWidth: 1 },
  rowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14, borderBottomWidth: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, paddingTop: 4 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold", color: C.text },
  modalClose: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  clearRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  clearText: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.primary },
  modalOption: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  optionSwatch: { width: 28, height: 28, borderRadius: 14 },
  optionSwatchBorder: { borderWidth: 1, borderColor: C.border },
  optionLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text },
  optionLabelActive: { fontFamily: "Inter_600SemiBold", color: C.primary },
  sizeBox: {
    width: 44, height: 28, borderRadius: 8, backgroundColor: C.surfaceSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border,
  },
  sizeBoxText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.text },
});
