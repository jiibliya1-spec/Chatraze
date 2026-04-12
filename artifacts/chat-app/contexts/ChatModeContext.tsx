import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Chat, Message, User } from "@/types";

type ChatMode = "real" | "demo";

type DemoChatMeta = {
  id: string;
  otherUserId: string;
  created_at: string;
};

type DemoState = {
  profile: User;
  contacts: string[];
  blocked: string[];
  messagesByChat: Record<string, Message[]>;
};

interface ChatModeContextType {
  mode: ChatMode;
  initialized: boolean;
  isDemoMode: boolean;
  setMode: (mode: ChatMode) => Promise<void>;
  demoProfile: User;
  demoUsers: User[];
  demoContacts: Set<string>;
  demoBlockedUsers: Set<string>;
  demoChats: Chat[];
  typingByChat: Record<string, boolean>;
  getDemoMessages: (chatId: string) => Message[];
  getDemoUser: (userId: string) => User | undefined;
  updateDemoProfile: (updates: Partial<Pick<User, "display_name" | "about" | "phone" | "avatar_url">>) => Promise<void>;
  addDemoContact: (userId: string) => Promise<void>;
  toggleDemoBlockedUser: (userId: string) => Promise<void>;
  sendDemoText: (chatId: string, content: string, replyTo?: Message | null) => Promise<void>;
  sendDemoImage: (chatId: string, imageUrl: string, replyTo?: Message | null) => Promise<void>;
  sendDemoVoice: (chatId: string, duration?: number) => Promise<void>;
  reactToDemoMessage: (chatId: string, messageId: string, emoji: string) => Promise<void>;
  deleteDemoMessage: (chatId: string, messageId: string) => Promise<void>;
  startDemoChat: (userId: string) => string;
}

const MODE_STORAGE_KEY = "chatraze:chat-mode";
const DEMO_STATE_STORAGE_KEY = "chatraze:demo-state";

const demoNow = Date.now();

const DEMO_SELF: User = {
  id: "demo-self",
  phone: "+1 202 555 0100",
  email: "you@chatraze.demo",
  display_name: "You",
  avatar_url: "https://i.pravatar.cc/150?img=68",
  about: "Building Chatraze",
  is_online: true,
  last_seen: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

const DEMO_USERS: User[] = [
  { id: "demo-u1", display_name: "Maya Chen", phone: "+1 415 555 0101", email: "maya@demo.app", avatar_url: "https://i.pravatar.cc/150?img=32", about: "Design review at 3?", is_online: true, last_seen: new Date(demoNow - 5 * 60 * 1000).toISOString(), created_at: new Date(demoNow - 20 * 86400000).toISOString() },
  { id: "demo-u2", display_name: "Noah Patel", phone: "+44 7700 900101", email: "noah@demo.app", avatar_url: "https://i.pravatar.cc/150?img=14", about: "Voice notes only", is_online: false, last_seen: new Date(demoNow - 35 * 60 * 1000).toISOString(), created_at: new Date(demoNow - 18 * 86400000).toISOString() },
  { id: "demo-u3", display_name: "Sara Ali", phone: "+971 50 555 0101", email: "sara@demo.app", avatar_url: "https://i.pravatar.cc/150?img=47", about: "On my way", is_online: true, last_seen: new Date(demoNow - 2 * 60 * 1000).toISOString(), created_at: new Date(demoNow - 15 * 86400000).toISOString() },
  { id: "demo-u4", display_name: "Lucas Reed", phone: "+1 646 555 0101", email: "lucas@demo.app", avatar_url: "https://i.pravatar.cc/150?img=12", about: "Send the screenshots", is_online: false, last_seen: new Date(demoNow - 90 * 60 * 1000).toISOString(), created_at: new Date(demoNow - 14 * 86400000).toISOString() },
  { id: "demo-u5", display_name: "Zara Khan", phone: "+92 300 5550101", email: "zara@demo.app", avatar_url: "https://i.pravatar.cc/150?img=25", about: "Coffee?", is_online: true, last_seen: new Date(demoNow - 1 * 60 * 1000).toISOString(), created_at: new Date(demoNow - 13 * 86400000).toISOString() },
  { id: "demo-u6", display_name: "Ethan Brooks", phone: "+1 917 555 0101", email: "ethan@demo.app", avatar_url: "https://i.pravatar.cc/150?img=53", about: "Boarding now", is_online: false, last_seen: new Date(demoNow - 4 * 3600 * 1000).toISOString(), created_at: new Date(demoNow - 10 * 86400000).toISOString() },
  { id: "demo-u7", display_name: "Layla Hassan", phone: "+20 100 5550101", email: "layla@demo.app", avatar_url: "https://i.pravatar.cc/150?img=41", about: "Let me call you", is_online: true, last_seen: new Date(demoNow - 8 * 60 * 1000).toISOString(), created_at: new Date(demoNow - 9 * 86400000).toISOString() },
  { id: "demo-u8", display_name: "Owen Garcia", phone: "+34 600 555101", email: "owen@demo.app", avatar_url: "https://i.pravatar.cc/150?img=61", about: "Sharing photos", is_online: false, last_seen: new Date(demoNow - 6 * 3600 * 1000).toISOString(), created_at: new Date(demoNow - 8 * 86400000).toISOString() },
  { id: "demo-u9", display_name: "Priya Menon", phone: "+91 98765 50101", email: "priya@demo.app", avatar_url: "https://i.pravatar.cc/150?img=19", about: "Typing...", is_online: true, last_seen: new Date(demoNow - 3 * 60 * 1000).toISOString(), created_at: new Date(demoNow - 6 * 86400000).toISOString() },
  { id: "demo-u10", display_name: "Theo Martins", phone: "+55 11 95550 1010", email: "theo@demo.app", avatar_url: "https://i.pravatar.cc/150?img=9", about: "Voice call later", is_online: false, last_seen: new Date(demoNow - 24 * 3600 * 1000).toISOString(), created_at: new Date(demoNow - 4 * 86400000).toISOString() },
];

const DEMO_CHATS_META: DemoChatMeta[] = DEMO_USERS.map((user, index) => ({
  id: `demo-chat-${index + 1}`,
  otherUserId: user.id,
  created_at: new Date(demoNow - (index + 1) * 3600 * 1000).toISOString(),
}));

function makeMessage(partial: Partial<Message> & Pick<Message, "chat_id" | "sender_id" | "content" | "type">): Message {
  return {
    id: partial.id ?? `msg-${Math.random().toString(36).slice(2, 10)}`,
    chat_id: partial.chat_id,
    sender_id: partial.sender_id,
    content: partial.content,
    type: partial.type,
    status: partial.status ?? "read",
    created_at: partial.created_at ?? new Date().toISOString(),
    sender: partial.sender,
    reply_to_id: partial.reply_to_id ?? null,
    reply_to: partial.reply_to ?? null,
    reactions: partial.reactions ?? [],
    duration: partial.duration ?? null,
    file_name: partial.file_name ?? null,
    file_size: partial.file_size ?? null,
    is_deleted: partial.is_deleted ?? false,
  };
}

function seedMessages(): Record<string, Message[]> {
  return Object.fromEntries(
    DEMO_CHATS_META.map((chat, index) => {
      const otherUser = DEMO_USERS[index];
      const base = demoNow - (index + 1) * 3600 * 1000;
      const messages: Message[] = [
        makeMessage({
          id: `${chat.id}-m3`,
          chat_id: chat.id,
          sender_id: otherUser.id,
          sender: otherUser,
          content: index % 3 === 0 ? "See you in 10 minutes." : index % 3 === 1 ? "😂 That was wild" : `https://picsum.photos/seed/${chat.id}/320/240`,
          type: index % 3 === 2 ? "image" : "text",
          status: "read",
          created_at: new Date(base + 3000).toISOString(),
        }),
        makeMessage({
          id: `${chat.id}-m2`,
          chat_id: chat.id,
          sender_id: DEMO_SELF.id,
          sender: DEMO_SELF,
          content: index % 2 === 0 ? "Perfect, sending now." : "Listen to this when you can",
          type: index % 2 === 0 ? "text" : "voice",
          duration: index % 2 === 0 ? null : 18 + index,
          status: "read",
          created_at: new Date(base + 2000).toISOString(),
        }),
        makeMessage({
          id: `${chat.id}-m1`,
          chat_id: chat.id,
          sender_id: otherUser.id,
          sender: otherUser,
          content: index % 4 === 0 ? "Morning!" : index % 4 === 1 ? "Can you review this image?" : index % 4 === 2 ? "Typing you after my call" : "👍",
          type: "text",
          status: "read",
          created_at: new Date(base + 1000).toISOString(),
        }),
      ];
      return [chat.id, messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())];
    })
  );
}

const DEFAULT_DEMO_STATE: DemoState = {
  profile: DEMO_SELF,
  contacts: DEMO_USERS.slice(0, 4).map((user) => user.id),
  blocked: [],
  messagesByChat: seedMessages(),
};

const ChatModeContext = createContext<ChatModeContextType | undefined>(undefined);

function randomReply(otherUser: User, chatId: string): Message {
  const replies = [
    "On it.",
    "Typing from demo mode 😄",
    "That looks great.",
    "I will call you in a bit.",
    "👍",
    "Sending a voice note next.",
  ];
  const picked = replies[Math.floor(Math.random() * replies.length)];
  const type = picked.includes("voice") ? "voice" : "text";
  return makeMessage({
    chat_id: chatId,
    sender_id: otherUser.id,
    sender: otherUser,
    content: type === "voice" ? "" : picked,
    type,
    duration: type === "voice" ? 11 + Math.floor(Math.random() * 15) : null,
    status: "delivered",
  });
}

export function ChatModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ChatMode>("real");
  const [initialized, setInitialized] = useState(false);
  const [demoState, setDemoState] = useState<DemoState>(DEFAULT_DEMO_STATE);
  const [typingByChat, setTypingByChat] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [storedMode, storedState] = await Promise.all([
          AsyncStorage.getItem(MODE_STORAGE_KEY),
          AsyncStorage.getItem(DEMO_STATE_STORAGE_KEY),
        ]);

        if (storedMode === "demo" || storedMode === "real") {
          setModeState(storedMode);
        }

        if (storedState) {
          const parsed = JSON.parse(storedState) as DemoState;
          setDemoState({
            profile: parsed.profile ?? DEFAULT_DEMO_STATE.profile,
            contacts: parsed.contacts ?? DEFAULT_DEMO_STATE.contacts,
            blocked: parsed.blocked ?? DEFAULT_DEMO_STATE.blocked,
            messagesByChat: parsed.messagesByChat ?? DEFAULT_DEMO_STATE.messagesByChat,
          });
        }
      } finally {
        setInitialized(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    AsyncStorage.setItem(DEMO_STATE_STORAGE_KEY, JSON.stringify(demoState)).catch(() => {});
  }, [demoState, initialized]);

  const setMode = useCallback(async (nextMode: ChatMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(MODE_STORAGE_KEY, nextMode);
  }, []);

  const demoUsers = useMemo(() => DEMO_USERS, []);
  const demoContacts = useMemo(() => new Set(demoState.contacts), [demoState.contacts]);
  const demoBlockedUsers = useMemo(() => new Set(demoState.blocked), [demoState.blocked]);

  const getDemoUser = useCallback(
    (userId: string) => {
      if (userId === demoState.profile.id) return demoState.profile;
      return demoUsers.find((user) => user.id === userId);
    },
    [demoState.profile, demoUsers]
  );

  const demoChats = useMemo<Chat[]>(() => {
    return DEMO_CHATS_META.map((chatMeta) => {
      const chatMessages = demoState.messagesByChat[chatMeta.id] ?? [];
      const otherUser = demoUsers.find((entry) => entry.id === chatMeta.otherUserId);
      const lastMessage = chatMessages[0];
      return {
        id: chatMeta.id,
        created_at: chatMeta.created_at,
        participants: [],
        other_user: otherUser,
        last_message: lastMessage,
        unread_count: lastMessage?.sender_id === DEMO_SELF.id ? 0 : Math.min(3, chatMessages.filter((msg) => msg.sender_id !== DEMO_SELF.id && msg.status !== "read").length),
        is_muted: false,
      };
    }).sort((a, b) => new Date(b.last_message?.created_at ?? b.created_at).getTime() - new Date(a.last_message?.created_at ?? a.created_at).getTime());
  }, [demoState.messagesByChat, demoUsers]);

  const updateDemoProfile = useCallback(async (updates: Partial<Pick<User, "display_name" | "about" | "phone" | "avatar_url">>) => {
    setDemoState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...updates,
      },
    }));
  }, []);

  const addDemoContact = useCallback(async (userId: string) => {
    setDemoState((prev) => ({
      ...prev,
      contacts: prev.contacts.includes(userId) ? prev.contacts : [...prev.contacts, userId],
    }));
  }, []);

  const toggleDemoBlockedUser = useCallback(async (userId: string) => {
    setDemoState((prev) => ({
      ...prev,
      blocked: prev.blocked.includes(userId)
        ? prev.blocked.filter((id) => id !== userId)
        : [...prev.blocked, userId],
    }));
  }, []);

  const updateMessageInChat = useCallback((chatId: string, messageId: string, updater: (message: Message) => Message) => {
    setDemoState((prev) => ({
      ...prev,
      messagesByChat: {
        ...prev.messagesByChat,
        [chatId]: (prev.messagesByChat[chatId] ?? []).map((message) => (message.id === messageId ? updater(message) : message)),
      },
    }));
  }, []);

  const pushDemoMessage = useCallback((chatId: string, message: Message) => {
    setDemoState((prev) => ({
      ...prev,
      messagesByChat: {
        ...prev.messagesByChat,
        [chatId]: [message, ...(prev.messagesByChat[chatId] ?? [])],
      },
    }));
  }, []);

  const scheduleFakeReply = useCallback((chatId: string) => {
    const chatMeta = DEMO_CHATS_META.find((chat) => chat.id === chatId);
    if (!chatMeta || demoBlockedUsers.has(chatMeta.otherUserId)) return;
    const otherUser = demoUsers.find((entry) => entry.id === chatMeta.otherUserId);
    if (!otherUser) return;

    setTypingByChat((prev) => ({ ...prev, [chatId]: true }));

    const delay = 1000 + Math.floor(Math.random() * 1000);
    setTimeout(() => {
      setTypingByChat((prev) => ({ ...prev, [chatId]: false }));
      pushDemoMessage(chatId, randomReply(otherUser, chatId));
    }, delay);
  }, [demoBlockedUsers, demoUsers, pushDemoMessage]);

  const sendDemoText = useCallback(async (chatId: string, content: string, replyTo?: Message | null) => {
    const message = makeMessage({
      chat_id: chatId,
      sender_id: demoState.profile.id,
      sender: demoState.profile,
      content,
      type: "text",
      status: "sent",
      reply_to_id: replyTo?.id ?? null,
      reply_to: replyTo ?? null,
    });
    pushDemoMessage(chatId, message);

    setTimeout(() => updateMessageInChat(chatId, message.id, (current) => ({ ...current, status: "delivered" })), 400);
    setTimeout(() => updateMessageInChat(chatId, message.id, (current) => ({ ...current, status: "read" })), 1200);
    scheduleFakeReply(chatId);
  }, [demoState.profile, pushDemoMessage, scheduleFakeReply, updateMessageInChat]);

  const sendDemoImage = useCallback(async (chatId: string, imageUrl: string, replyTo?: Message | null) => {
    const message = makeMessage({
      chat_id: chatId,
      sender_id: demoState.profile.id,
      sender: demoState.profile,
      content: imageUrl,
      type: "image",
      status: "sent",
      reply_to_id: replyTo?.id ?? null,
      reply_to: replyTo ?? null,
    });
    pushDemoMessage(chatId, message);
    setTimeout(() => updateMessageInChat(chatId, message.id, (current) => ({ ...current, status: "delivered" })), 300);
    setTimeout(() => updateMessageInChat(chatId, message.id, (current) => ({ ...current, status: "read" })), 900);
    scheduleFakeReply(chatId);
  }, [demoState.profile, pushDemoMessage, scheduleFakeReply, updateMessageInChat]);

  const sendDemoVoice = useCallback(async (chatId: string, duration?: number) => {
    const message = makeMessage({
      chat_id: chatId,
      sender_id: demoState.profile.id,
      sender: demoState.profile,
      content: "",
      type: "voice",
      duration: duration ?? (8 + Math.floor(Math.random() * 26)),
      status: "sent",
    });
    pushDemoMessage(chatId, message);
    setTimeout(() => updateMessageInChat(chatId, message.id, (current) => ({ ...current, status: "delivered" })), 300);
    setTimeout(() => updateMessageInChat(chatId, message.id, (current) => ({ ...current, status: "read" })), 1000);
    scheduleFakeReply(chatId);
  }, [demoState.profile, pushDemoMessage, scheduleFakeReply, updateMessageInChat]);

  const reactToDemoMessage = useCallback(async (chatId: string, messageId: string, emoji: string) => {
    updateMessageInChat(chatId, messageId, (message) => {
      const reactions = [...(message.reactions ?? [])];
      const existingIndex = reactions.findIndex((reaction) => reaction.user_id === demoState.profile.id && reaction.emoji === emoji);
      if (existingIndex >= 0) {
        reactions.splice(existingIndex, 1);
      } else {
        const otherReactionIndex = reactions.findIndex((reaction) => reaction.user_id === demoState.profile.id);
        if (otherReactionIndex >= 0) reactions.splice(otherReactionIndex, 1);
        reactions.push({ emoji, user_id: demoState.profile.id, user: demoState.profile });
      }
      return { ...message, reactions };
    });
  }, [demoState.profile, updateMessageInChat]);

  const deleteDemoMessage = useCallback(async (chatId: string, messageId: string) => {
    updateMessageInChat(chatId, messageId, (message) => ({
      ...message,
      is_deleted: true,
      content: "",
    }));
  }, [updateMessageInChat]);

  const getDemoMessages = useCallback((chatId: string) => demoState.messagesByChat[chatId] ?? [], [demoState.messagesByChat]);

  const startDemoChat = useCallback((userId: string) => {
    const chat = DEMO_CHATS_META.find((entry) => entry.otherUserId === userId);
    return chat?.id ?? DEMO_CHATS_META[0].id;
  }, []);

  const value = useMemo<ChatModeContextType>(() => ({
    mode,
    initialized,
    isDemoMode: mode === "demo",
    setMode,
    demoProfile: demoState.profile,
    demoUsers,
    demoContacts,
    demoBlockedUsers,
    demoChats,
    typingByChat,
    getDemoMessages,
    getDemoUser,
    updateDemoProfile,
    addDemoContact,
    toggleDemoBlockedUser,
    sendDemoText,
    sendDemoImage,
    sendDemoVoice,
    reactToDemoMessage,
    deleteDemoMessage,
    startDemoChat,
  }), [
    addDemoContact,
    demoBlockedUsers,
    demoChats,
    demoContacts,
    demoState.profile,
    demoUsers,
    deleteDemoMessage,
    getDemoMessages,
    getDemoUser,
    initialized,
    mode,
    reactToDemoMessage,
    sendDemoImage,
    sendDemoText,
    sendDemoVoice,
    setMode,
    startDemoChat,
    toggleDemoBlockedUser,
    typingByChat,
    updateDemoProfile,
  ]);

  return <ChatModeContext.Provider value={value}>{children}</ChatModeContext.Provider>;
}

export function useChatMode() {
  const ctx = useContext(ChatModeContext);
  if (!ctx) throw new Error("useChatMode must be used within ChatModeProvider");
  return ctx;
}