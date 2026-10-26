// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface EntitySearchOptions {
  includeAddress?: boolean;
  includeClient?: boolean;
  typeFilter?: string;
  city?: string;
  zipPrefix?: string;
  [key: string]: unknown;
}
