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
}

export interface IProactiveUnreadCount {
  count: number;
}

export interface IProactiveInboxChanged {
  unreadCount: number;
}
