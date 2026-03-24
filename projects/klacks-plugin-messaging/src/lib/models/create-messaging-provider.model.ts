// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Request model for creating or updating a messaging provider.
 */
export interface CreateMessagingProvider {
  name: string;
  displayName: string;
  providerType: string;
  isEnabled: boolean;
  configJson: string;
}
