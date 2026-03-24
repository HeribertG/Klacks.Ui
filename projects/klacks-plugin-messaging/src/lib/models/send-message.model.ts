// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
