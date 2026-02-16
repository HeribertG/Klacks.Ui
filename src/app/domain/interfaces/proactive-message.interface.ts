export interface IProactiveMessage {
  messageId: string;
  content: string;
  conversationId?: string;
  timestamp: string;
  messageType: 'proactive' | 'onboarding';
}
