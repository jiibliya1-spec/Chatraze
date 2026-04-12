import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useChatMode } from "@/contexts/ChatModeContext";
import { View, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { session, loading } = useAuth();
  const { initialized, isDemoMode } = useChatMode();
  const colors = useColors();

  if (__DEV__) {
    console.log("📄 Index screen - loading:", loading, "session:", !!session);
  }

  if (loading || !initialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isDemoMode) {
    return <Redirect href="/chats" />;
  }

  if (!session) {
    return <Redirect href="/auth/email" />;
  }

  return <Redirect href="/chats" />;
}
