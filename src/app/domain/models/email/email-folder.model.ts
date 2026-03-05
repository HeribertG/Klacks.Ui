// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
