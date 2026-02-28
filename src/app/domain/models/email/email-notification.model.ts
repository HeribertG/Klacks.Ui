// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
