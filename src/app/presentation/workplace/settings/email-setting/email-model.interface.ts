// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface EmailModel {
  outgoingServer: string;
  outgoingServerPort: string;
  outgoingServerTimeout: string;
  enabledSSL: string;
  authenticationType: string;
  dispositionNotification: string;
  readReceipt: string;
  replyTo: string;
  username: string;
  password: string;
}
