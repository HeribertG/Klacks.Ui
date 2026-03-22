// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * SignalR notification model for incoming messages from external providers.
 */
export interface IncomingMessage {
  messageId: string;
  providerName: string;
  providerDisplayName: string;
  sender: string;
  senderDisplayName: string;
  content: string;
  contentType: string;
  timestamp: string;
}
