// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { ProactiveReaction } from 'src/app/domain/constants/proactive-reaction.constants';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  suggestedReplies?: ISuggestedRepliesConfig;
  navigateTo?: string;
  actionPerformed?: boolean;
  isStreaming?: boolean;
  /** Pre-formatted HTML content, kept in sync with content on every update including streaming flushes. */
  formattedContent?: string;
  /** User message that this assistant response answered. Set on assistant messages only. */
  respondedToUserMessage?: string;
  /** Set after the user submitted a correction for this assistant message. */
  correctionSubmitted?: boolean;
  /** Set when this message originated from a backend push (SignalR) instead of answering the current conversation. */
  messageKind?: 'proactive' | 'onboarding';
  /** Reaction the user chose for a proactive message; once set, the reaction buttons lock. */
  proactiveReaction?: ProactiveReaction;
  /** Trigger kind of a proactive message (e.g. unstaffed_shift, mute_suggestion). */
  proactiveKind?: string;
  /** Severity the backend assigned ("high" | "medium" | "low"); drives the urgent badge/accent. */
  proactiveSeverity?: string;
  /** Frontend route offered as one-click action on a proactive message. */
  proactiveActionRoute?: string;
  /** Query params for the one-click action route. */
  proactiveActionParams?: Record<string, string>;
  /** Trigger kind a mute suggestion offers to silence, taken from the message content params. */
  proactiveMuteTargetKind?: string;
  /** Set after the user muted the suggested trigger kind; locks the mute button. */
  proactiveMuted?: boolean;
}
