// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
