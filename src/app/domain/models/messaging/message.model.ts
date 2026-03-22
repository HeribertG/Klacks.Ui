// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Message model for display in the messaging inbox.
 */
import { MessageDirection } from '../../enums/message-direction.enum';
import { MessageStatus } from '../../enums/message-status.enum';

export interface Message {
  id: string;
  providerId: string;
  providerName: string;
  externalMessageId: string;
  sender: string;
  senderDisplayName: string;
  recipient: string;
  recipientDisplayName: string;
  content: string;
  contentType: string;
  direction: MessageDirection;
  status: MessageStatus;
  timestamp: string;
  errorMessage: string | null;
  mediaUrl: string | null;
}
