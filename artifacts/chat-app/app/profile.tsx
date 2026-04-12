import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useChatMode } from "@/contexts/ChatModeContext";
import { useI18n, LANGUAGES, Language } from "@/contexts/I18nContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut, refreshUser } = useAuth();
  const { isDemoMode, setMode, demoProfile, updateDemoProfile } = useChatMode();
  const { setTheme, isDark } = useTheme();
  const { t, language, changeLanguage } = useI18n();
  const profile = isDemoMode ? demoProfile : user;
  const [name, setName] = useState(profile?.display_name ?? "");
  const [about, setAbout] = useState(profile?.about ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [editingName, setEditingName] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    setName(profile?.display_name ?? "");
    setAbout(profile?.about ?? "");
    setPhone(profile?.phone ?? "");
    setAvatarPreviewUrl(profile?.avatar_url ?? null);
  }, [profile?.about, profile?.avatar_url, profile?.display_name, profile?.phone]);

  const validatePhone = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    const digits = trimmed.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15 && /^[+]?[-()\s\d]+$/.test(trimmed);
  };

  const handleSave = async () => {
    const normalizedPhone = phone.trim();
    if (!validatePhone(normalizedPhone)) {
      setFeedback({ type: "error", message: "Enter a valid phone number." });
      return;
    }

    setFeedback(null);
    setSaving(true);

    try {
      if (isDemoMode) {
        await updateDemoProfile({
          display_name: name.trim() || null,
          about: about.trim() || null,
          phone: normalizedPhone,
        });
        setEditingName(false);
        setEditingAbout(false);
        setEditingPhone(false);
        setFeedback({ type: "success", message: "Demo profile updated successfully." });
        return;
      }

      if (!user) return;
      const { error } = await supabase
        .from("users")
        .update({
          display_name: name.trim() || null,
          about: about.trim() || null,
          phone: normalizedPhone,
        })
        .eq("id", user.id);
      if (error) throw error;

      await refreshUser();
      setEditingName(false);
      setEditingAbout(false);
      setEditingPhone(false);
      setFeedback({ type: "success", message: "Profile updated successfully." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save profile";
      setFeedback({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatarFile = async (file: Blob | File, options: { contentType: string; previewUrl: string; ext: string }) => {
    const previousAvatar = avatarPreviewUrl;
    setFeedback(null);
    setAvatarPreviewUrl(options.previewUrl);
    setUploadingAvatar(true);

    try {
      if (isDemoMode) {
        await updateDemoProfile({ avatar_url: options.previewUrl });
        setFeedback({ type: "success", message: "Demo profile photo updated successfully." });
        return;
      }

      if (!user) return;
      const path = `${user.id}/${Date.now()}.${options.ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: options.contentType, upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setAvatarPreviewUrl(publicUrl);
      await refreshUser();
      setFeedback({ type: "success", message: "Profile photo updated successfully." });
    } catch (error) {
      setAvatarPreviewUrl(previousAvatar ?? profile?.avatar_url ?? null);
      const message = error instanceof Error ? error.message : "Could not upload avatar";
      setFeedback({ type: "error", message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickAvatar = async () => {
    if (!profile) return;
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".jpg,.jpeg,.png,image/jpeg,image/png";
      input.style.display = "none";
      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        input.remove();
        if (!file) return;

        const isSupportedType = ["image/jpeg", "image/png", "image/jpg"].includes(file.type);
        if (!isSupportedType) {
          setFeedback({ type: "error", message: "Please choose a JPG or PNG image." });
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setFeedback({ type: "error", message: "Image must be smaller than 5 MB." });
          return;
        }

        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
        const previewUrl = URL.createObjectURL(file);
        try {
          await uploadAvatarFile(file, {
            contentType: file.type,
            previewUrl,
            ext,
          });
        } finally {
          URL.revokeObjectURL(previewUrl);
        }
      };
      document.body.appendChild(input);
      input.click();
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;
    try {
      const asset = result.assets[0];
      const ext = (asset.uri.split(".").pop() ?? "jpg").toLowerCase();
      if (!["jpg", "jpeg", "png"].includes(ext)) {
        setFeedback({ type: "error", message: "Please choose a JPG or PNG image." });
        return;
      }
      if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) {
        setFeedback({ type: "error", message: "Image must be smaller than 5 MB." });
        return;
      }
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      await uploadAvatarFile(blob, {
        contentType: asset.mimeType || `image/${ext}`,
        previewUrl: asset.uri,
        ext,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not upload avatar";
      setFeedback({ type: "error", message });
    }
  };

  const handleSignOut = async () => {
    if (isDemoMode) {
      await setMode("real");
      router.replace("/auth/email");
      return;
    }
    if (Platform.OS === "web") {
      await signOut();
      router.replace("/auth/email");
      return;
    }
    Alert.alert(t("logout"), "Are you sure you want to sign out?", [
      { text: t("cancel"), style: "cancel" },
      { text: t("logout"), style: "destructive", onPress: async () => { await signOut(); router.replace("/auth/email"); } },
    ]);
  };

  const currentLang = LANGUAGES.find((l) => l.code === language);

  const goBackOrChats = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/chats");
  };

  const displayName = name || profile?.display_name || t("addYourName");
  const phoneText = profile?.phone || profile?.email || "-";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, paddingTop: topPad + 8 }]}>
        <Pressable onPress={goBackOrChats} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("profile")}</Text>
        {(editingName || editingAbout) && (
          <Pressable onPress={handleSave} style={styles.saveBtn} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.saveBtnText}>{t("save")}</Text>}
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomPad + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar section */}
        <View style={[styles.avatarSection, { backgroundColor: colors.headerBg }]}>
          <View style={styles.avatarWrap}>
            <Avatar uri={avatarPreviewUrl} name={displayName} size={88} />
            <Pressable
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
              hitSlop={10}
              style={[styles.avatarEditBadge, { backgroundColor: colors.primary, opacity: uploadingAvatar ? 0.8 : 1 }]}
            >
              {uploadingAvatar
                ? <ActivityIndicator size="small" color="white" />
                : <Ionicons name="camera" size={16} color="white" />
              }
            </Pressable>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.avatarName}>{displayName}</Text>
            <Text style={styles.avatarSub}>{phoneText}</Text>
          </View>
        </View>

        {feedback && (
          <View
            style={[
              styles.feedbackBox,
              {
                backgroundColor: feedback.type === "success" ? colors.primary + "18" : colors.destructive + "18",
                borderColor: feedback.type === "success" ? colors.primary + "55" : colors.destructive + "55",
              },
            ]}
          >
            <Ionicons
              name={feedback.type === "success" ? "checkmark-circle-outline" : "alert-circle-outline"}
              size={18}
              color={feedback.type === "success" ? colors.primary : colors.destructive}
            />
            <Text style={{ color: feedback.type === "success" ? colors.primary : colors.destructive, flex: 1 }}>
              {feedback.message}
            </Text>
          </View>
        )}

        {/* Name field */}
        <View style={[styles.section, { backgroundColor: colors.card, marginTop: 12 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t("yourName")}</Text>
          </View>
          <View style={[styles.fieldRow, { borderBottomColor: colors.separator }]}>
            {editingName ? (
              <>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderBottomColor: colors.primary }]}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                <Pressable onPress={() => setEditingName(false)}>
                  <Ionicons name="close" size={20} color={colors.mutedForeground} />
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.fieldValue, { color: name ? colors.foreground : colors.mutedForeground }]}>
                  {name || t("addYourName")}
                </Text>
                <Pressable onPress={() => setEditingName(true)}>
                  <Ionicons name="pencil-outline" size={18} color={colors.mutedForeground} />
                </Pressable>
              </>
            )}
          </View>
          {/* About field */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t("about")}</Text>
          </View>
          <View style={styles.fieldRow}>
            {editingAbout ? (
              <>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderBottomColor: colors.primary }]}
                  value={about}
                  onChangeText={setAbout}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                <Pressable onPress={() => setEditingAbout(false)}>
                  <Ionicons name="close" size={20} color={colors.mutedForeground} />
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.fieldValue, { color: about ? colors.foreground : colors.mutedForeground }]}>
                  {about || t("availableStatus")}
                </Text>
                <Pressable onPress={() => setEditingAbout(true)}>
                  <Ionicons name="pencil-outline" size={18} color={colors.mutedForeground} />
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t("phone")}</Text>
          </View>
          <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}> 
            {editingPhone ? (
              <>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderBottomColor: colors.primary }]}
                  value={phone}
                  onChangeText={setPhone}
                  autoFocus
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  placeholderTextColor={colors.mutedForeground}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                <Pressable onPress={() => { setPhone(profile?.phone ?? ""); setEditingPhone(false); }}>
                  <Ionicons name="close" size={20} color={colors.mutedForeground} />
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.fieldValue, { color: phone ? colors.foreground : colors.mutedForeground }]}>{phone || "Add phone number"}</Text>
                <Pressable onPress={() => setEditingPhone(true)}>
                  <Ionicons name="pencil-outline" size={18} color={colors.mutedForeground} />
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: colors.card, marginTop: 8 }]}>
          {/* Dark mode */}
          <View style={[styles.settingRow, { borderBottomColor: colors.separator }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: "#6366f1" }]}>
                <Ionicons name="moon-outline" size={18} color="white" />
              </View>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t("darkMode")}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(v) => setTheme(v ? "dark" : "light")}
              trackColor={{ false: colors.border, true: colors.primary + "88" }}
              thumbColor={isDark ? colors.primary : "#f1f5f9"}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.separator }]}> 
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primaryDark }]}> 
                <Ionicons name="flask-outline" size={18} color="white" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Demo mode</Text>
                <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>Use seeded chats without signing in</Text>
              </View>
            </View>
            <Switch
              value={isDemoMode}
              onValueChange={(value) => setMode(value ? "demo" : "real")}
              trackColor={{ false: colors.border, true: colors.primary + "88" }}
              thumbColor={isDemoMode ? colors.primary : "#f1f5f9"}
            />
          </View>

          {/* Language */}
          <Pressable
            style={[styles.settingRow, { borderBottomColor: colors.separator }]}
            onPress={() => setShowLangPicker((v) => !v)}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}>
                <Ionicons name="language-outline" size={18} color="white" />
              </View>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t("language")}</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{currentLang?.nativeLabel}</Text>
              <Ionicons name={showLangPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>

          {/* Language options */}
          {showLangPicker && (
            <View style={[styles.langPickerWrap, { borderBottomColor: colors.separator }]}>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  style={[styles.langOption, { borderBottomColor: colors.separator }]}
                  onPress={() => { changeLanguage(lang.code as Language); setShowLangPicker(false); }}
                >
                  <Text style={[styles.langLabel, { color: language === lang.code ? colors.primary : colors.foreground }]}>
                    {lang.nativeLabel}
                  </Text>
                  {language === lang.code && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </View>
          )}

          {/* Notifications */}
          <Pressable
            style={[styles.settingRow, { borderBottomColor: colors.separator }]}
            onPress={() => router.push("/settings/notifications")}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: "#f59e0b" }]}>
                <Ionicons name="notifications-outline" size={18} color="white" />
              </View>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t("notifications")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </Pressable>

          {/* Privacy */}
          <Pressable
            style={[styles.settingRow, { borderBottomColor: colors.separator }]}
            onPress={() => router.push("/settings/privacy")}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: "#10b981" }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="white" />
              </View>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t("privacy")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Sign out */}
        <View style={[styles.section, { backgroundColor: colors.card, marginTop: 8 }]}>
          <Pressable style={styles.settingRow} onPress={handleSignOut}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.destructive }]}>
                <Ionicons name="log-out-outline" size={18} color="white" />
              </View>
              <Text style={[styles.settingLabel, { color: colors.destructive }]}>{t("logout")}</Text>
            </View>
          </Pressable>
        </View>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>Chatraze v1.0.0</Text>
        <Text style={[styles.encryptNote, { color: colors.mutedForeground }]}>
          🔒 {t("encryptionNote")}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, color: "white", fontSize: 20, fontWeight: "700" },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)" },
  saveBtnText: { color: "white", fontWeight: "700" },
  avatarSection: { alignItems: "center", paddingTop: 20, paddingBottom: 28, gap: 12 },
  avatarWrap: { position: "relative" },
  avatarEditBadge: { position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "white" },
  avatarInfo: { alignItems: "center", gap: 4 },
  avatarName: { color: "white", fontSize: 20, fontWeight: "700" },
  avatarSub: { color: "rgba(255,255,255,0.75)", fontSize: 14 },
  feedbackBox: {
    marginTop: 12,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  section: { overflow: "hidden" },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  sectionLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  fieldRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  fieldInput: { flex: 1, fontSize: 16, borderBottomWidth: 1.5, paddingBottom: 2 },
  fieldValue: { flex: 1, fontSize: 16 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  settingLabel: { fontSize: 16 },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { fontSize: 14 },
  langPickerWrap: { paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  langOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  langLabel: { fontSize: 16 },
  version: { textAlign: "center", marginTop: 28, fontSize: 12 },
  encryptNote: { textAlign: "center", marginTop: 6, fontSize: 12, marginBottom: 12 },
});
