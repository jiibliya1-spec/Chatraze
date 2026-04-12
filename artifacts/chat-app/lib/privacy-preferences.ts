import { supabase } from "@/lib/supabase";

export type PrivacyVisibility = "everyone" | "contacts" | "nobody";

export interface PrivacyPreferences {
  lastSeen: PrivacyVisibility;
  profilePhoto: PrivacyVisibility;
  readReceipts: boolean;
}

export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  lastSeen: "everyone",
  profilePhoto: "contacts",
  readReceipts: true,
};

function normalizeVisibility(value: string | null | undefined): PrivacyVisibility {
  if (value === "everyone" || value === "contacts" || value === "nobody") return value;
  return "everyone";
}

export async function loadPrivacyPreferences(userId: string): Promise<PrivacyPreferences> {
  const { data, error } = await supabase
    .from("profiles")
    .select("last_seen_visibility,profile_photo_visibility,read_receipts")
    .eq("id", userId)
    .single();

  if (error || !data) {
    await savePrivacyPreferences(userId, DEFAULT_PRIVACY_PREFERENCES);
    return DEFAULT_PRIVACY_PREFERENCES;
  }

  return {
    lastSeen: normalizeVisibility(data.last_seen_visibility),
    profilePhoto: normalizeVisibility(data.profile_photo_visibility),
    readReceipts: data.read_receipts ?? true,
  };
}

export async function savePrivacyPreferences(
  userId: string,
  prefs: PrivacyPreferences
): Promise<void> {
  const payload = {
    id: userId,
    last_seen_visibility: prefs.lastSeen,
    profile_photo_visibility: prefs.profilePhoto,
    read_receipts: prefs.readReceipts,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}
