export interface User {
  id: string;
  phone_number: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  language: 'ar' | 'en' | 'fr';
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  name?: string;
  chat_type: 'direct' | 'group';
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: string[];
}

export interface ChatMember {
  id: string;
  chat_id: string;
  user_id: string;
  joined_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'audio';
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface MessageMedia {
  id: string;
  message_id: string;
  media_url: string;
  media_type: string;
  file_size: number;
  duration?: number;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  nickname?: string;
  is_blocked: boolean;
  created_at: string;
}

export interface TypingIndicator {
  id: string;
  chat_id: string;
  user_id: string;
  created_at: string;
}