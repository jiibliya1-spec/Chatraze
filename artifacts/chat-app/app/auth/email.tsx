import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useChatMode } from "@/contexts/ChatModeContext";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/contexts/I18nContext";

function isSupabaseConfigured() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return (
    !!url &&
    !!key &&
    !url.includes("your-supabase-project-url") &&
    !key.includes("your-supabase-anon-key")
  );
}

export default function EmailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { setMode } = useChatMode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError(t("enterEmailAndPassword"));
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: cleanEmail, password });
        if (error) setError(error.message);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) {
          setError(error.message);
        } else {
          router.replace("/chats");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected authentication error";
      if (message.toLowerCase().includes("load failed") || message.toLowerCase().includes("network")) {
        setError("Network/auth request failed. Check Supabase URL/key and internet connectivity.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueInDemo = async () => {
    await setMode("demo");
    router.replace("/chats");
  };

  const topPad = Platform.OS === "web" ? 0 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with logo */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, paddingTop: topPad + 40 }]}>
        <View style={[styles.logoCircle, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Ionicons name="chatbubbles" size={52} color="white" />
        </View>
        <Text style={styles.appName}>{t("appName")}</Text>
        <Text style={styles.tagline}>{t("tagline")}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isSignUp ? t("signUp") : t("signIn")}
          </Text>

          {/* Email input */}
          <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder={t("email")}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password input */}
          <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder={t("password")}
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPassword}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18" }]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>{isSignUp ? t("signUp") : t("signIn")}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => { setIsSignUp(!isSignUp); setError(null); }} style={styles.toggle}>
            <Text style={[styles.toggleText, { color: colors.mutedForeground }]}>
              {isSignUp ? t("alreadyHaveAccount") : t("noAccount")}
            </Text>
          </Pressable>

          <Pressable onPress={handleContinueInDemo} style={[styles.demoButton, { borderColor: colors.border, backgroundColor: colors.card }]}> 
            <Ionicons name="flask-outline" size={16} color={colors.primary} />
            <Text style={[styles.demoButtonText, { color: colors.foreground }]}>Continue in Demo Mode</Text>
          </Pressable>

          <View style={styles.encryptionRow}>
            <Ionicons name="lock-closed" size={12} color={colors.mutedForeground} />
            <Text style={[styles.encryptionText, { color: colors.mutedForeground }]}>
              {t("encryptionNote")}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    paddingBottom: 48,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: { color: "white", fontSize: 30, fontWeight: "800", letterSpacing: 0.5 },
  tagline: { color: "rgba(255,255,255,0.75)", fontSize: 14, marginTop: 6 },
  form: { padding: 28 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 28 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, height: "100%" },
  eyeBtn: { padding: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, flex: 1 },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#E11D2A",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonText: { color: "white", fontSize: 17, fontWeight: "700" },
  toggle: { alignItems: "center", marginTop: 20, padding: 8 },
  toggleText: { fontSize: 14 },
  demoButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
  },
  demoButtonText: { fontSize: 15, fontWeight: "600" },
  encryptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 28,
  },
  encryptionText: { fontSize: 12 },
});