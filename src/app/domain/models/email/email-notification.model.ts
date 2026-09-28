// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface INewEmailsNotification {
  count: number;
  timestamp: string;
}

export interface IEmailReadStateNotification {
  emailId: string;
  isRead: boolean;
  folder: string;
  timestamp: string;
}
