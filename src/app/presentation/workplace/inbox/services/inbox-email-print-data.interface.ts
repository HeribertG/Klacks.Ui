// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface InboxEmailPrintData {
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  fromName: string;
  fromAddress: string;
  toAddress: string;
  receivedDate: string;
  folder: string;
}
