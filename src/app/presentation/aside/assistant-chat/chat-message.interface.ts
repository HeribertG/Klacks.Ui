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
  /** Set after the user marked this assistant message as helpful; locks the thumbs-up. */
  helpfulSubmitted?: boolean;
  /** Set when this message originated from a backend push (SignalR) instead of answering the current conversation. */
  messageKind?: 'proactive';
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
  /** Set after the user delegated ("mach du") this finding; locks the delegate button. */
  proactiveDelegated?: boolean;
  /** Whether this message reported a condition-ledger finding the delegate button can act on. */
  proactiveCanDelegate?: boolean;
  /** How often this proactive message was re-sent as a reminder (0 = first delivery); drives the reminder badge. */
  proactiveReminderCount?: number;
  /** Set after the user acknowledged ("Erledigt") this message; locks the acknowledge button. */
  proactiveAcknowledged?: boolean;
}
