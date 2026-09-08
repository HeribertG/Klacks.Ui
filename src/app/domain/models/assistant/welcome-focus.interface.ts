// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * The single most urgent open state Klacksy asks about in the welcome toast. Mirrors the backend
 * WelcomeFocusResource and carries i18n keys and slot values only, never localized text.
 * @param kind - Trigger kind, sent back to the snooze endpoint when the user picks "later"
 * @param promptKey - i18n key of the headline question
 * @param promptParams - Slot values for the headline template; date slots arrive as yyyy-MM-dd
 * @param actionKind - "navigate" or "consultation", see WELCOME_FOCUS_ACTION_KIND
 * @param actionLabelKey - i18n key of the first button
 * @param actionRoute - Angular route for actionKind "navigate", null for "consultation"
 * @param conditionId - Journal row id, informational, null for the fresh setup candidate
 */
export interface IWelcomeFocus {
  kind: string;
  promptKey: string;
  promptParams: Record<string, string>;
  actionKind: string;
  actionLabelKey: string;
  actionRoute?: string | null;
  conditionId?: string | null;
}
