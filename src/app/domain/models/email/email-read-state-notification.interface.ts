// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IEmailReadStateNotification {
  emailId: string;
  isRead: boolean;
  folder: string;
  timestamp: string;
}
