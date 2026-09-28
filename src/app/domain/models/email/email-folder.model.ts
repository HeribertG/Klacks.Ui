// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IEmailFolder {
  id: string;
  name: string;
  imapFolderName: string;
  sortOrder: number;
  isSystem: boolean;
  specialUse: string | null;
  unreadCount: number;
  totalCount: number;
}
