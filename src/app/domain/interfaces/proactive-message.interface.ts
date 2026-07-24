// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IProactiveMessage {
  messageId: string;
  content: string;
  conversationId?: string;
  timestamp: string;
  messageType: 'proactive' | 'onboarding';
  contentParams?: Record<string, string>;
  kind?: string | null;
  actionRoute?: string | null;
  actionParams?: Record<string, string> | null;
}
