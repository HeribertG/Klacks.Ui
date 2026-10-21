// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
