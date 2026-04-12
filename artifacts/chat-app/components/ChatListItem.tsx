import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/contexts/I18nContext";
import { Chat } from "@/types";
import { TranslationKey } from "@/lib/i18n";

interface ChatListItemProps {
  chat: Chat;
}

function formatTime(dateStr: string, t: (k: TranslationKey) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return t("yesterday");
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChatListItem({ chat }: ChatListItemProps) {
  const colors = useColors();
  const { t } = useI18n();
  const otherUser = chat.other_user;
  const lastMsg = chat.last_message;

  const timeStr = formatTime(lastMsg?.created_at ?? chat.created_at, t);
  const hasUnread = (chat.unread_count ?? 0) > 0;

  const getPreview = () => {
    if (!lastMsg) return t("startNewChat");
    if (lastMsg.is_deleted) return "🚫 This message was deleted";
    if (lastMsg.type === "image") return `📷 ${t("photo")}`;
    if (lastMsg.type === "voice" || lastMsg.type === "audio") return `🎤 ${t("voiceMessage")}`;
    if (lastMsg.type === "video") return `🎥 ${t("video")}`;
    if (lastMsg.type === "file") return `📎 ${lastMsg.file_name ?? t("file")}`;
    return lastMsg.content;
  };

  return (
    <Pressable
      onPress={() => router.push(`/chat/${chat.id}`)}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: pressed ? colors.muted : colors.background },
      ]}
    >
      <Avatar
        uri={otherUser?.avatar_url}
        name={otherUser?.display_name || otherUser?.phone}
        size={54}
        showOnline
        isOnline={otherUser?.is_online ?? false}
      />

      <View style={[styles.content, { borderBottomColor: colors.separator }]}>
        <View style={styles.row}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {otherUser?.display_name || otherUser?.phone || "Unknown"}
          </Text>
          <Text style={[styles.time, { color: hasUnread ? colors.primary : colors.mutedForeground }]}>
            {timeStr}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.previewRow}>
            {/* Read receipt tick for sent messages */}
            {lastMsg && !hasUnread && lastMsg.status && (
              <View style={styles.tickWrap}>
                {lastMsg.status === "sent" && (
                  <Ionicons name="checkmark" size={14} color={colors.mutedForeground} />
                )}
                {lastMsg.status === "delivered" && (
                  <Ionicons name="checkmark-done" size={14} color={colors.mutedForeground} />
                )}
                {lastMsg.status === "read" && (
                  <Ionicons name="checkmark-done" size={14} color="#53BDEB" />
                )}
              </View>
            )}
            <Text
              style={[
                styles.preview,
                { color: hasUnread ? colors.foreground : colors.mutedForeground },
                hasUnread ? styles.previewBold : null,
              ]}
              numberOfLines={1}
            >
              {getPreview()}
            </Text>
          </View>

          {hasUnread ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>
                {chat.unread_count! > 99 ? "99+" : chat.unread_count}
              </Text>
            </View>
          ) : (
            chat.is_muted && (
              <Ionicons name="volume-mute-outline" size={16} color={colors.mutedForeground} />
            )
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 12,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 16, fontWeight: "600", flex: 1, marginRight: 8 },
  time: { fontSize: 12 },
  previewRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 2 },
  tickWrap: { marginRight: 2 },
  preview: { fontSize: 14, flex: 1 },
  previewBold: { fontWeight: "600" },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "white", fontSize: 12, fontWeight: "700" },
});

