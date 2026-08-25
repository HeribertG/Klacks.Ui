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
}

export interface IProactiveUnreadCount {
  count: number;
}

export interface IProactiveInboxChanged {
  unreadCount: number;
}
