import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatListItem } from "@/components/ChatListItem";
import { useAuth } from "@/contexts/AuthContext";
import { useChatMode } from "@/contexts/ChatModeContext";
import { useI18n } from "@/contexts/I18nContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { Chat, Message, User } from "@/types";

export default function ChatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDemoMode, demoChats, initialized } = useChatMode();
  const { t } = useI18n();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchChats = useCallback(async () => {
    if (isDemoMode) {
      setChats(demoChats);
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: participants } = await supabase
      .from("chat_participants")
      .select("chat_id")
      .eq("user_id", user.id);

    if (!participants || participants.length === 0) {
      setChats([]);
      setLoading(false);
      return;
    }

    const chatIds = participants.map((p) => p.chat_id);

    const { data: chatsData } = await supabase
      .from("chats")
      .select("*")
      .in("id", chatIds)
      .order("created_at", { ascending: false });

    if (!chatsData) {
      setChats([]);
      setLoading(false);
      return;
    }

    const enrichedChats: Chat[] = await Promise.all(
      chatsData.map(async (chat) => {
        const { data: allParticipants } = await supabase
          .from("chat_participants")
          .select("*, user:users(*)")
          .eq("chat_id", chat.id);

        const other = allParticipants?.find((p) => p.user_id !== user.id);
        const otherUser = other?.user as User | undefined;

        const { data: lastMsgData } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_id", chat.id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("chat_id", chat.id)
          .neq("sender_id", user.id)
          .eq("status", "delivered");

        return {
          ...chat,
          other_user: otherUser,
          last_message: lastMsgData as Message | undefined,
          unread_count: count ?? 0,
        };
      })
    );

    enrichedChats.sort((a, b) => {
      const aTime = a.last_message?.created_at ?? a.created_at;
      const bTime = b.last_message?.created_at ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setChats(enrichedChats);
    setLoading(false);
  }, [demoChats, isDemoMode, user]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    fetchChats();

    if (isDemoMode) {
      return;
    }

    if (!user?.id) {
      return;
    }

    const channel = supabase
      .channel("chats-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchChats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => fetchChats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_participants", filter: `user_id=eq.${user.id}` },
        () => fetchChats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchChats, initialized, isDemoMode, user?.id]);

  const filteredChats = chats.filter((c) => {
    if (!search) return true;
    const name = c.other_user?.display_name || c.other_user?.phone || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>{t("appName")}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/new-chat")} style={styles.headerBtn}>
            <Ionicons name="create-outline" size={24} color="white" />
          </Pressable>
          <Pressable onPress={() => router.push("/profile")} style={styles.headerBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.headerBg }]}>
        <View style={[styles.searchBar, {
          backgroundColor: searchFocused ? colors.card : colors.searchBg,
          borderColor: searchFocused ? colors.primary : "transparent",
        }]}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder={t("searchConversations")}
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name="chatbubbles-outline" size={52} color={colors.primary} />
          </View>
          <Text style={[styles.emptyText, { color: colors.foreground }]}>
            {search ? t("noResults") : t("noConversations")}
          </Text>
          {!search && (
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
              {t("startNewChat")}
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatListItem chat={item} />}
          contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/new-chat")}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad + 20 }]}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: { padding: 6 },
  searchContainer: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 40,
    borderWidth: 1.5,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 18, fontWeight: "700" },
  emptySubText: { fontSize: 14 },
  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#E11D2A",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
