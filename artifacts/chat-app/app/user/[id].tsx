import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useChatMode } from "@/contexts/ChatModeContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { User } from "@/types";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    isDemoMode,
    demoContacts,
    demoBlockedUsers,
    getDemoUser,
    addDemoContact,
    toggleDemoBlockedUser,
    startDemoChat,
  } = useChatMode();

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom + 12;

  const goBackOrChats = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/chats");
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      if (isDemoMode) {
        setProfile(getDemoUser(id) ?? null);
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("users").select("*").eq("id", id).single();
      setProfile((data as User | null) ?? null);
      setLoading(false);
    };

    setLoading(true);
    loadProfile();
  }, [getDemoUser, id, isDemoMode]);

  const handleStartChat = async () => {
    if (!id) return;
    setBusyAction("chat");

    try {
      if (isDemoMode) {
        const chatId = startDemoChat(id);
        router.replace({ pathname: "/chat/[id]", params: { id: chatId } });
        return;
      }

      if (!user) {
        router.replace("/auth/email");
        return;
      }

      const { data: existing } = await supabase.from("chat_participants").select("chat_id").eq("user_id", user.id);
      const { data: otherParticipants } = await supabase.from("chat_participants").select("chat_id").eq("user_id", id);
      const myChats = new Set((existing ?? []).map((participant: { chat_id: string }) => participant.chat_id));
      const sharedChat = (otherParticipants ?? []).find((participant: { chat_id: string }) => myChats.has(participant.chat_id));

      if (sharedChat) {
        router.replace({ pathname: "/chat/[id]", params: { id: sharedChat.chat_id } });
        return;
      }

      const { data: newChat } = await supabase.from("chats").insert({}).select().single();
      if (newChat) {
        await supabase.from("chat_participants").insert([
          { chat_id: newChat.id, user_id: user.id },
          { chat_id: newChat.id, user_id: id },
        ]);
        router.replace({ pathname: "/chat/[id]", params: { id: newChat.id } });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleCall = (type: "audio" | "video") => {
    if (!id) return;
    const chatId = isDemoMode ? startDemoChat(id) : `direct-${id}`;
    router.push({ pathname: "/call/[id]", params: { id: chatId, calleeId: id, type } });
  };

  const handleContact = async () => {
    if (!id) return;
    setBusyAction("contact");

    try {
      if (isDemoMode) {
        await addDemoContact(id);
        return;
      }

      if (!user) return;
      await supabase.from("contacts").upsert({ user_id: user.id, contact_id: id }, { onConflict: "user_id,contact_id" });
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleBlock = async () => {
    if (!id) return;

    if (isDemoMode) {
      setBusyAction("block");
      try {
        await toggleDemoBlockedUser(id);
      } finally {
        setBusyAction(null);
      }
      return;
    }

    Alert.alert("Block user", "Blocking is available in demo mode. Real-mode persistence is not wired yet.");
  };

  const handleReport = () => {
    Alert.alert("Report user", "Report flow is still a local placeholder. Hook it into your moderation backend when ready.");
  };

  const isContact = !!(id && demoContacts.has(id));
  const isBlocked = !!(id && demoBlockedUsers.has(id));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.headerBg, paddingTop: topPad + 8 }]}>
        <Pressable onPress={goBackOrChats} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Contact Info</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !profile ? (
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>User not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: bottomPad }}>
          <View style={[styles.hero, { backgroundColor: colors.headerBg }]}> 
            <Avatar uri={profile.avatar_url} name={profile.display_name || profile.phone} size={96} showOnline isOnline={profile.is_online} />
            <Text style={styles.heroName}>{profile.display_name || profile.phone}</Text>
            <Text style={styles.heroSub}>{profile.phone}</Text>
            <Text style={styles.heroAbout}>{profile.about || "Available on Chatraze"}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}> 
            <View style={[styles.infoRow, { borderBottomColor: colors.separator }]}> 
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{profile.email || "Not shared"}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: colors.separator }]}> 
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Status</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{profile.is_online ? "Online" : "Recently active"}</Text>
            </View>
            <View style={styles.infoRow}> 
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Mode</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{isDemoMode ? "Demo user" : "Real account"}</Text>
            </View>
          </View>

          <View style={[styles.actionsCard, { backgroundColor: colors.card }]}> 
            <Pressable style={[styles.primaryAction, { backgroundColor: colors.primary }]} onPress={handleStartChat}>
              {busyAction === "chat" ? <ActivityIndicator color="white" /> : <Text style={styles.primaryActionText}>Message</Text>}
            </Pressable>

            <View style={styles.inlineActions}>
              <Pressable style={[styles.iconAction, { backgroundColor: colors.muted }]} onPress={() => handleCall("audio")}>
                <Ionicons name="call-outline" size={22} color={colors.foreground} />
                <Text style={[styles.iconActionLabel, { color: colors.foreground }]}>Voice</Text>
              </Pressable>
              <Pressable style={[styles.iconAction, { backgroundColor: colors.muted }]} onPress={() => handleCall("video")}>
                <Ionicons name="videocam-outline" size={22} color={colors.foreground} />
                <Text style={[styles.iconActionLabel, { color: colors.foreground }]}>Video</Text>
              </Pressable>
              <Pressable style={[styles.iconAction, { backgroundColor: colors.muted }]} onPress={handleContact}>
                {busyAction === "contact" ? <ActivityIndicator color={colors.primary} /> : <>
                  <Ionicons name={isContact ? "checkmark-circle-outline" : "person-add-outline"} size={22} color={colors.foreground} />
                  <Text style={[styles.iconActionLabel, { color: colors.foreground }]}>{isContact ? "Added" : "Add"}</Text>
                </>}
              </Pressable>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}> 
            <Pressable style={[styles.menuRow, { borderBottomColor: colors.separator }]} onPress={handleToggleBlock}>
              <View style={styles.menuLeft}>
                <Ionicons name={isBlocked ? "lock-open-outline" : "ban-outline"} size={20} color={colors.destructive} />
                <Text style={[styles.menuText, { color: colors.destructive }]}>{isBlocked ? "Unblock" : "Block"}</Text>
              </View>
              {busyAction === "block" ? <ActivityIndicator color={colors.destructive} size="small" /> : null}
            </Pressable>
            <Pressable style={styles.menuRow} onPress={handleReport}>
              <View style={styles.menuLeft}>
                <Ionicons name="flag-outline" size={20} color={colors.destructive} />
                <Text style={[styles.menuText, { color: colors.destructive }]}>Report</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24 },
  emptyText: { fontSize: 15 },
  hero: { alignItems: "center", paddingTop: 22, paddingBottom: 28, gap: 8 },
  heroName: { color: "white", fontSize: 24, fontWeight: "700" },
  heroSub: { color: "rgba(255,255,255,0.75)", fontSize: 15 },
  heroAbout: { color: "rgba(255,255,255,0.92)", fontSize: 14, paddingHorizontal: 24, textAlign: "center" },
  card: { marginTop: 12, marginHorizontal: 16, borderRadius: 18, overflow: "hidden" },
  actionsCard: { marginTop: 12, marginHorizontal: 16, borderRadius: 18, padding: 16, gap: 14 },
  infoRow: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  infoLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  infoValue: { fontSize: 16 },
  primaryAction: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryActionText: { color: "white", fontSize: 16, fontWeight: "700" },
  inlineActions: { flexDirection: "row", gap: 12 },
  iconAction: { flex: 1, minHeight: 76, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 8 },
  iconActionLabel: { fontSize: 13, fontWeight: "600" },
  menuRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuText: { fontSize: 16, fontWeight: "600" },
});
