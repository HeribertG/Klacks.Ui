// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IReceivedEmailListItem {
  id: string;
  messageId: string;
  fromAddress: string;
  fromName: string;
  toAddress: string;
  subject: string;
  receivedDate: string;
  isRead: boolean;
  hasAttachments: boolean;
  folder: string;
}

export interface IReceivedEmail extends IReceivedEmailListItem {
  bodyHtml: string;
  bodyText: string;
  imapUid: number;
}

export interface IReceivedEmailListResponse {
  items: IReceivedEmailListItem[];
  totalCount: number;
  unreadCount: number;
}

export interface ITranslatedEmail {
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  targetLanguage: string;
}
