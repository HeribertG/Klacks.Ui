// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface EntitySearchOptions {
  includeAddress?: boolean;
  includeClient?: boolean;
  typeFilter?: string;
  [key: string]: any;
}
