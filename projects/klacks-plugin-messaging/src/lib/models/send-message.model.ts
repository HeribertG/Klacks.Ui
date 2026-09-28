// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Request model for sending a message via a messaging provider.
 */
export interface SendMessage {
  provider: string;
  recipient: string;
  content: string;
  contentType: string;
  mediaUrl?: string;
}
