// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IProactiveInboxItem {
  id: string;
  content: string;
  contentParams?: Record<string, string>;
  severity?: string | null;
  reaction?: string | null;
  createdUtc: string;
  readAtUtc?: string | null;
  kind?: string | null;
  actionRoute?: string | null;
  actionParams?: Record<string, string> | null;
  /** Whether this message reported a condition-ledger finding the "mach du" delegate action can act on. */
  canDelegate?: boolean;
  /** How often the backend re-sent this row as a reminder (0 or unset = first delivery). */
  reminderCount?: number;
  /** When the latest reminder was sent (UTC). */
  lastRemindedAtUtc?: string | null;
  /** Set once the user acknowledged the message; a reminder is the same row with this still null. */
  acknowledgedAtUtc?: string | null;
}

export interface IProactiveUnreadCount {
  count: number;
}

export interface IProactiveInboxChanged {
  unreadCount: number;
}
