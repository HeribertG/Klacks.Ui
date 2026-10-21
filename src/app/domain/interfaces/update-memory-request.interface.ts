// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IUpdateMemoryRequest {
  key?: string;
  content?: string;
  category?: string;
  importance?: number;
  isPinned?: boolean;
}
