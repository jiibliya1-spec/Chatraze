import AsyncStorage from "@react-native-async-storage/async-storage";

export type PrivacyVisibility = "everyone" | "contacts" | "nobody";
export type NotificationSound = "default" | "silent" | "vibrate_only";
export type VibrateMode = "on" | "off";

export interface UserPreferences {
  privacy: {
    lastSeen: PrivacyVisibility;
    profilePhoto: PrivacyVisibility;
    readReceipts: boolean;
  };
  notifications: {
    messageNotifications: boolean;
    sound: NotificationSound;
    vibrate: VibrateMode;
  };
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  privacy: {
    lastSeen: "everyone",
    profilePhoto: "contacts",
    readReceipts: true,
  },
  notifications: {
    messageNotifications: true,
    sound: "default",
    vibrate: "on",
  },
};

function storageKey(userId: string) {
  return `chatraze:user-preferences:${userId}`;
}

function mergeWithDefaults(raw?: Partial<UserPreferences> | null): UserPreferences {
  return {
    privacy: {
      ...DEFAULT_USER_PREFERENCES.privacy,
      ...(raw?.privacy ?? {}),
    },
    notifications: {
      ...DEFAULT_USER_PREFERENCES.notifications,
      ...(raw?.notifications ?? {}),
    },
  };
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  try {
    const json = await AsyncStorage.getItem(storageKey(userId));
    if (!json) return DEFAULT_USER_PREFERENCES;
    const parsed = JSON.parse(json) as Partial<UserPreferences>;
    return mergeWithDefaults(parsed);
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
}

export async function saveUserPreferences(userId: string, prefs: UserPreferences): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(prefs));
}

export async function updateUserPreferences(
  userId: string,
  updater: (prev: UserPreferences) => UserPreferences
): Promise<UserPreferences> {
  const current = await getUserPreferences(userId);
  const next = updater(current);
  await saveUserPreferences(userId, next);
  return next;
}