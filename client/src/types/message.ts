export type MessageSource = 'chat' | 'asl' | 'stt';

export interface ChatMessage {
  id: string;
  source: MessageSource;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}
