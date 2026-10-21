// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ICreateMemoryRequest {
  key: string;
  content: string;
  category?: string;
  importance?: number;
  isPinned?: boolean;
  expiresAt?: string;
}
