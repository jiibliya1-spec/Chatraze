export const API_CONFIG = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  DOCUMENT: 'document',
} as const;

export const CHAT_TYPES = {
  DIRECT: 'direct',
  GROUP: 'group',
} as const;

export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
} as const;

export const MAX_MESSAGE_LENGTH = 4096;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_AUDIO_SIZE = 10 * 1024 * 1024;

export const LANGUAGES = {
  AR: 'ar',
  EN: 'en',
  FR: 'fr',
} as const;

export const SUPPORTED_LANGUAGES = ['ar', 'en', 'fr'] as const;