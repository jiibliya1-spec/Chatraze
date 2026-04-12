export type MessageStatus = "sent" | "delivered" | "read";
export type MessageType = "text" | "image" | "audio" | "video" | "file" | "voice";

export interface User {
  id: string;
  phone: string;
  email?: string | null;
  display_name: string | null;
  avatar_url: string | null;
  about?: string | null;
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
}

export interface Chat {
  id: string;
  created_at: string;
  participants: ChatParticipant[];
  last_message?: Message;
  unread_count?: number;
  other_user?: User;
  is_muted?: boolean;
}

export interface ChatParticipant {
  chat_id: string;
  user_id: string;
  joined_at: string;
  user?: User;
}

export interface MessageReaction {
  emoji: string;
  user_id: string;
  user?: User;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  created_at: string;
  sender?: User;
  reply_to_id?: string | null;
  reply_to?: Message | null;
  reactions?: MessageReaction[];
  duration?: number | null;
  file_name?: string | null;
  file_size?: number | null;
  is_deleted?: boolean;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_id: string;
  contact?: User;
}

export type CallStatus = "calling" | "ringing" | "connected" | "ended" | "declined" | "missed";
export type CallType = "audio" | "video";

export interface Call {
  id: string;
  caller_id: string;
  callee_id: string;
  type: CallType;
  status: CallStatus;
  started_at: string;
  ended_at?: string | null;
  offer?: string | null;
  answer?: string | null;
}

