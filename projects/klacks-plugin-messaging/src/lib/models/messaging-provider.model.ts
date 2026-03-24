// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Messaging provider configuration model.
 */
export interface MessagingProvider {
  id: string;
  name: string;
  displayName: string;
  providerType: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
