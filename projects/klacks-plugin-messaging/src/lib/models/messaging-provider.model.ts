// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
