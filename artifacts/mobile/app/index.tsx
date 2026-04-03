import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.light;

export default function OnboardingScreen() {
  const { user, setUser } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"role" | "name">("role");
  const [role, setRole] = useState<"consumer" | "driver" | null>(null);
  const [name, setName] = useState("");

  React.useEffect(() => {
    if (user) {
      if (user.role === "consumer") router.replace("/(tabs)");
      else router.replace("/driver");
    }
  }, [user]);

  const handleRoleSelect = (r: "consumer" | "driver") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRole(r);
    setStep("name");
  };

  const handleContinue = async () => {
    if (!name.trim() || !role) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const id = `${role}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await setUser({ id, name: name.trim(), role });
  };

  if (step === "role") {
    return (
      <LinearGradient colors={["#1A1A2E", "#16213E", "#0F3460"]} style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="truck-delivery" size={48} color={C.primary} />
          </View>
          <Text style={styles.appName}>SiteDeliver</Text>
          <Text style={styles.tagline}>Construction materials, delivered fast</Text>
        </View>

        <View style={styles.rolesSection}>
          <Text style={styles.chooseLabel}>I am a...</Text>

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => handleRoleSelect("consumer")}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["rgba(255,107,53,0.15)", "rgba(255,107,53,0.05)"]} style={styles.roleCardGradient}>
              <View style={styles.roleIcon}>
                <MaterialCommunityIcons name="hard-hat" size={32} color={C.primary} />
              </View>
              <View style={styles.roleContent}>
                <Text style={styles.roleTitle}>Site Manager</Text>
                <Text style={styles.roleDesc}>Order materials delivered to job sites</Text>
              </View>
              <Feather name="chevron-right" size={20} color={C.primary} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => handleRoleSelect("driver")}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["rgba(34,197,94,0.15)", "rgba(34,197,94,0.05)"]} style={styles.roleCardGradient}>
              <View style={[styles.roleIcon, { backgroundColor: "rgba(34,197,94,0.2)" }]}>
                <MaterialCommunityIcons name="truck" size={32} color={C.success} />
              </View>
              <View style={styles.roleContent}>
                <Text style={styles.roleTitle}>Driver</Text>
                <Text style={styles.roleDesc}>Pick up and deliver orders to sites</Text>
              </View>
              <Feather name="chevron-right" size={20} color={C.success} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#1A1A2E", "#16213E", "#0F3460"]} style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => setStep("role")}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.nameSection}>
            <View style={[styles.roleIconLarge, role === "driver" ? { backgroundColor: "rgba(34,197,94,0.2)" } : {}]}>
              <MaterialCommunityIcons
                name={role === "driver" ? "truck" : "hard-hat"}
                size={40}
                color={role === "driver" ? C.success : C.primary}
              />
            </View>
            <Text style={styles.welcomeTitle}>What's your name?</Text>
            <Text style={styles.welcomeSubtitle}>
              {role === "driver" ? "We'll display this on your deliveries" : "We'll use this for your orders"}
            </Text>

            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />

            <TouchableOpacity
              style={[styles.continueButton, !name.trim() && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={!name.trim()}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={name.trim() ? [C.primary, C.primaryDark] : ["#444", "#333"]}
                style={styles.continueGradient}
              >
                <Text style={styles.continueText}>Get Started</Text>
                <Feather name="arrow-right" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  appName: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginTop: 8,
  },
  rolesSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  chooseLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  roleCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  roleCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  roleIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "rgba(255,107,53,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  backButton: {
    padding: 24,
  },
  nameSection: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    paddingTop: 20,
  },
  roleIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(255,107,53,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginBottom: 40,
  },
  nameInput: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#fff",
    marginBottom: 24,
  },
  continueButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueGradient: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  continueText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
