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
  getUserPreferences,
  NotificationSound,
  updateUserPreferences,
  VibrateMode,
} from "@/lib/user-preferences";

const SOUND_OPTIONS: Array<{ value: NotificationSound; label: string }> = [
  { value: "default", label: "Default" },
  { value: "silent", label: "Silent" },
];

const VIBRATE_OPTIONS: Array<{ value: VibrateMode; label: string }> = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
];

async function getNotificationPermissionsSafe() {
  if (Platform.OS === "web") {
    return { granted: false };
  }
  const Notifications = await import("expo-notifications");
  return Notifications.getPermissionsAsync();
}

async function requestNotificationPermissionsSafe() {
  if (Platform.OS === "web") {
    return { granted: false };
  }
  const Notifications = await import("expo-notifications");
  return Notifications.requestPermissionsAsync();
}

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [sound, setSound] = useState<NotificationSound>("default");
  const [vibrate, setVibrate] = useState<VibrateMode>("on");
  const [pickerType, setPickerType] = useState<"sound" | "vibrate" | null>(null);

  const userId = user?.id ?? "anonymous";

  useEffect(() => {
    const loadPrefs = async () => {
      const prefs = await getUserPreferences(userId);
      let notificationsEnabled = prefs.notifications.messageNotifications;

      if (Platform.OS === "web" && typeof Notification !== "undefined") {
        notificationsEnabled = Notification.permission === "granted" && notificationsEnabled;
      } else {
        const perms = await getNotificationPermissionsSafe();
        notificationsEnabled = perms.granted && notificationsEnabled;
      }

      setMessageNotifications(notificationsEnabled);
      setSound(prefs.notifications.sound === "silent" ? "silent" : "default");
      setVibrate(prefs.notifications.vibrate);
      setLoading(false);
    };
    loadPrefs();
  }, [userId]);

  const saveNotificationsToggle = async (value: boolean) => {
    let enabled = value;

    if (value) {
      if (Platform.OS === "web") {
        if (typeof Notification === "undefined") {
          Alert.alert("Unsupported", "Notifications are not supported in this browser.");
          enabled = false;
        } else {
          const permission = await Notification.requestPermission();
          enabled = permission === "granted";
          if (!enabled) {
            Alert.alert("Permission required", "Allow notifications in browser settings to enable this.");
          }
        }
      } else {
        const current = await getNotificationPermissionsSafe();
        if (current.granted) {
          enabled = true;
        } else {
          const requested = await requestNotificationPermissionsSafe();
          enabled = requested.granted;
          if (!enabled) {
            Alert.alert("Permission required", "Allow notifications in device settings to enable this.");
          }
        }
      }
    }

    setMessageNotifications(enabled);
    await updateUserPreferences(userId, (prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        messageNotifications: enabled,
      },
    }));
  };

  const saveSound = async (value: NotificationSound) => {
    setSound(value);
    await updateUserPreferences(userId, (prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        sound: value,
      },
    }));
  };

  const saveVibrate = async (value: VibrateMode) => {
    setVibrate(value);
    await updateUserPreferences(userId, (prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        vibrate: value,
      },
    }));
  };

  const soundLabel = SOUND_OPTIONS.find((o) => o.value === sound)?.label ?? "Default";
  const vibrateLabel = VIBRATE_OPTIONS.find((o) => o.value === vibrate)?.label ?? "On";

  const openSoundSheet = () => {
    const labels = SOUND_OPTIONS.map((o) => o.label);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Sound",
          options: [...labels, "Cancel"],
          cancelButtonIndex: labels.length,
        },
        (index) => {
          if (index >= 0 && index < SOUND_OPTIONS.length) {
            void saveSound(SOUND_OPTIONS[index].value);
          }
        }
      );
      return;
    }

    setPickerType("sound");
  };

  const openVibrateSheet = () => {
    const labels = VIBRATE_OPTIONS.map((o) => o.label);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Vibrate",
          options: [...labels, "Cancel"],
          cancelButtonIndex: labels.length,
        },
        (index) => {
          if (index >= 0 && index < VIBRATE_OPTIONS.length) {
            void saveVibrate(VIBRATE_OPTIONS[index].value);
          }
        }
      );
      return;
    }

    setPickerType("vibrate");
  };

  const closePicker = () => setPickerType(null);

  const onPickOption = (value: NotificationSound | VibrateMode) => {
    if (pickerType === "sound") {
      void saveSound(value as NotificationSound);
    } else if (pickerType === "vibrate") {
      void saveVibrate(value as VibrateMode);
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
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
      <View style={[styles.card, { backgroundColor: colors.card }]}> 
        <View style={[styles.row, { borderBottomColor: colors.separator }]}> 
          <Text style={[styles.label, { color: colors.foreground }]}>Message notifications</Text>
          <Switch
            value={messageNotifications}
            onValueChange={(value) => {
              void saveNotificationsToggle(value);
            }}
            trackColor={{ false: colors.border, true: colors.primary + "88" }}
            thumbColor={messageNotifications ? colors.primary : "#f1f5f9"}
          />
        </View>
        <Pressable
          style={[styles.row, { borderBottomColor: colors.separator }]}
          onPress={openSoundSheet}
        >
          <Text style={[styles.label, { color: colors.foreground }]}>Sound</Text>
          <View style={styles.valueWrap}>
            <Text style={[styles.value, { color: colors.mutedForeground }]}>{soundLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </View>
        </Pressable>
        <Pressable style={styles.row} onPress={openVibrateSheet}> 
          <Text style={[styles.label, { color: colors.foreground }]}>Vibrate</Text>
          <View style={styles.valueWrap}>
            <Text style={[styles.value, { color: colors.mutedForeground }]}>{vibrateLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </View>
        </Pressable>
      </View>
      )}

      <Modal transparent visible={pickerType !== null} animationType="fade" onRequestClose={closePicker}>
        <TouchableWithoutFeedback onPress={closePicker}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: colors.card }]}> 
                <Text style={[styles.modalTitle, { color: colors.foreground }]}> 
                  {pickerType === "sound" ? "Sound" : "Vibrate"}
                </Text>
                {(pickerType === "sound" ? SOUND_OPTIONS : VIBRATE_OPTIONS).map((option) => {
                  const selected = (pickerType === "sound" ? sound : vibrate) === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.modalRow, { borderBottomColor: colors.separator }]}
                      onPress={() => onPickOption(option.value)}
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