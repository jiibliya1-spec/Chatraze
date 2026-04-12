import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { User } from "@/types";

export default function ContactsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [addingContactId, setAddingContactId] = useState<string | null>(null);
  const [contactIds, setContactIds] = useState<Set<string>>(new Set());

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const goBackOrChats = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/chats");
  };

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      let query = supabase.from("users").select("*").neq("id", user?.id ?? "");
      if (search.trim()) {
        query = query.or(
          `display_name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`
        );
      }
      const { data } = await query.order("display_name", { ascending: true }).limit(50);
      setUsers((data as User[]) ?? []);
      setLoading(false);
    };
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [search, user?.id]);

  useEffect(() => {
    const loadContacts = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("contacts")
        .select("contact_id")
        .eq("user_id", user.id);
      setContactIds(new Set((data ?? []).map((row) => row.contact_id)));
    };

    loadContacts();
  }, [user?.id]);

  const addContact = async (contactId: string) => {
    if (!user?.id || contactId === user.id) return;
    setAddingContactId(contactId);
    try {
      const { error } = await supabase
        .from("contacts")
        .upsert({ user_id: user.id, contact_id: contactId }, { onConflict: "user_id,contact_id" });
      if (error) throw error;

      setContactIds((prev) => new Set([...prev, contactId]));
    } finally {
      setAddingContactId(null);
    }
  };

  const startChat = async (otherUserId: string) => {
    if (!user) return;
    setStarting(otherUserId);
    const { data: existing } = await supabase.from("chat_participants").select("chat_id").eq("user_id", user.id);
    const { data: otherParticipants } = await supabase.from("chat_participants").select("chat_id").eq("user_id", otherUserId);
    const myChats = new Set((existing ?? []).map((p: any) => p.chat_id));
    const sharedChat = (otherParticipants ?? []).find((p: any) => myChats.has(p.chat_id));
    if (sharedChat) {
      router.replace(`/chat/${sharedChat.chat_id}`);
      return;
    }
    const { data: newChat } = await supabase.from("chats").insert({}).select().single();
    if (newChat) {
      await supabase.from("chat_participants").insert([
        { chat_id: newChat.id, user_id: user.id },
        { chat_id: newChat.id, user_id: otherUserId },
      ]);
      router.replace(`/chat/${newChat.id}`);
    }
    setStarting(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, paddingTop: topPad + 8 }]}>
        <Pressable onPress={goBackOrChats} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("contacts")}</Text>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder={t("searchByNameOrPhone")}
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t("noResults")}</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: bottomPad + 20 }}
          renderItem={({ item }) => (
            <View style={[styles.userRow, { backgroundColor: colors.background, borderBottomColor: colors.separator }]}>
              <Avatar uri={item.avatar_url} name={item.display_name || item.phone} size={52} showOnline isOnline={item.is_online} />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.foreground }]}>{item.display_name || item.phone}</Text>
                <Text style={[styles.userSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.is_online ? t("online") : item.about || item.phone || item.email || ""}
                </Text>
              </View>
              {addingContactId === item.id ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : contactIds.has(item.id) ? (
                <View style={[styles.addedBadge, { borderColor: colors.separator }]}> 
                  <Text style={[styles.addedText, { color: colors.mutedForeground }]}>Added</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => addContact(item.id)}
                >
                  <Ionicons name="person-add" size={16} color="white" />
                </Pressable>
              )}
              <Pressable style={[styles.chatBtn, { backgroundColor: colors.card }]} onPress={() => startChat(item.id)}>
                {starting === item.id
                  ? <ActivityIndicator color={colors.primary} size="small" />
                  : <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                }
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, color: "white", fontSize: 20, fontWeight: "700" },
  searchWrap: { paddingHorizontal: 12, paddingVertical: 10 },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 24, paddingHorizontal: 14, height: 42, borderWidth: 1.5, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { fontSize: 16 },
  userRow: { flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: "600" },
  userSub: { fontSize: 13, marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  chatBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  addedBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  addedText: { fontSize: 12, fontWeight: "600" },
});
