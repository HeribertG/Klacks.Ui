// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
