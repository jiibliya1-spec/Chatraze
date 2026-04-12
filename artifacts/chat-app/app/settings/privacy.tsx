import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  loadPrivacyPreferences,
  PrivacyVisibility,
  savePrivacyPreferences,
} from "@/lib/privacy-preferences";

const VISIBILITY_OPTIONS: Array<{ value: PrivacyVisibility; label: string }> = [
  { value: "everyone", label: "Everyone" },
  { value: "contacts", label: "My contacts" },
  { value: "nobody", label: "Nobody" },
];

export default function PrivacySettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState<PrivacyVisibility>("everyone");
  const [profilePhoto, setProfilePhoto] = useState<PrivacyVisibility>("contacts");
  const [readReceipts, setReadReceipts] = useState(true);
  const [pickerType, setPickerType] = useState<"lastSeen" | "profilePhoto" | null>(null);

  const userId = user?.id ?? "anonymous";

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const prefs = await loadPrivacyPreferences(userId);
        setLastSeen(prefs.lastSeen);
        setProfilePhoto(prefs.profilePhoto);
        setReadReceipts(prefs.readReceipts);
      } catch (error) {
        console.warn("Failed to load privacy preferences:", error);
      }
      setLoading(false);
    };
    if (user?.id) {
      loadPrefs();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const labelForVisibility = (value: PrivacyVisibility) =>
    VISIBILITY_OPTIONS.find((o) => o.value === value)?.label ?? "Everyone";

  const persistPrefs = async (next: {
    lastSeen: PrivacyVisibility;
    profilePhoto: PrivacyVisibility;
    readReceipts: boolean;
  }) => {
    if (!user?.id) return;
    try {
      await savePrivacyPreferences(user.id, {
        lastSeen: next.lastSeen,
        profilePhoto: next.profilePhoto,
        readReceipts: next.readReceipts,
      });
    } catch (error) {
      console.warn("Failed to save privacy preferences:", error);
      Alert.alert("Save failed", "Could not save privacy settings to Supabase.");
    }
  };

  const updateLastSeen = async (value: PrivacyVisibility) => {
    setLastSeen(value);
    await persistPrefs({ lastSeen: value, profilePhoto, readReceipts });
  };

  const updateProfilePhoto = async (value: PrivacyVisibility) => {
    setProfilePhoto(value);
    await persistPrefs({ lastSeen, profilePhoto: value, readReceipts });
  };

  const toggleReadReceipts = async (value: boolean) => {
    setReadReceipts(value);
    await persistPrefs({ lastSeen, profilePhoto, readReceipts: value });
  };

  const openVisibilitySheet = (
    title: string,
    onSelect: (value: PrivacyVisibility) => void
  ) => {
    const labels = VISIBILITY_OPTIONS.map((o) => o.label);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: [...labels, "Cancel"],
          cancelButtonIndex: labels.length,
        },
        (index) => {
          if (index >= 0 && index < VISIBILITY_OPTIONS.length) {
            onSelect(VISIBILITY_OPTIONS[index].value);
          }
        }
      );
      return;
    }

    if (title === "Last seen") {
      setPickerType("lastSeen");
    } else {
      setPickerType("profilePhoto");
    }
  };

  const closePicker = () => setPickerType(null);

  const onPickVisibility = (value: PrivacyVisibility) => {
    if (pickerType === "lastSeen") {
      void updateLastSeen(value);
    } else if (pickerType === "profilePhoto") {
      void updateProfilePhoto(value);
    }
    closePicker();
  };

  const goBackOrProfile = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/profile");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.headerBg, paddingTop: (Platform.OS === "web" ? 0 : insets.top) + 8 }]}> 
        <Pressable onPress={goBackOrProfile} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
      <View style={[styles.card, { backgroundColor: colors.card }]}> 
        <Pressable
          style={[styles.row, { borderBottomColor: colors.separator }]}
          onPress={() => openVisibilitySheet("Last seen", (value) => {
            void updateLastSeen(value);
          })}
        >
          <Text style={[styles.label, { color: colors.foreground }]}>Last seen</Text>
          <View style={styles.valueWrap}>
            <Text style={[styles.value, { color: colors.mutedForeground }]}>{labelForVisibility(lastSeen)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </View>
        </Pressable>
        <Pressable
          style={[styles.row, { borderBottomColor: colors.separator }]}
          onPress={() => openVisibilitySheet("Profile photo", (value) => {
            void updateProfilePhoto(value);
          })}
        >
          <Text style={[styles.label, { color: colors.foreground }]}>Profile photo</Text>
          <View style={styles.valueWrap}>
            <Text style={[styles.value, { color: colors.mutedForeground }]}>{labelForVisibility(profilePhoto)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </View>
        </Pressable>
        <View style={styles.row}> 
          <Text style={[styles.label, { color: colors.foreground }]}>Read receipts</Text>
          <Switch
            value={readReceipts}
              onValueChange={(value) => {
                void toggleReadReceipts(value);
              }}
            trackColor={{ false: colors.border, true: colors.primary + "88" }}
            thumbColor={readReceipts ? colors.primary : "#f1f5f9"}
          />
        </View>
      </View>
      )}

      <Modal transparent visible={pickerType !== null} animationType="fade" onRequestClose={closePicker}>
        <TouchableWithoutFeedback onPress={closePicker}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: colors.card }]}> 
                <Text style={[styles.modalTitle, { color: colors.foreground }]}> 
                  {pickerType === "lastSeen" ? "Last seen" : "Profile photo"}
                </Text>
                {VISIBILITY_OPTIONS.map((option) => {
                  const selected = (pickerType === "lastSeen" ? lastSeen : profilePhoto) === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.modalRow, { borderBottomColor: colors.separator }]}
                      onPress={() => onPickVisibility(option.value)}
                    >
                      <Text style={[styles.modalOption, { color: selected ? colors.primary : colors.foreground }]}>
                        {option.label}
                      </Text>
                      {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                    </Pressable>
                  );
                })}
                <Pressable style={styles.modalRow} onPress={closePicker}>
                  <Text style={[styles.modalOption, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { marginTop: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  valueWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 16, fontWeight: "500" },
  value: { fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingBottom: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalRow: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalOption: { fontSize: 16 },
});