// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface VirtualGroup {
  id: string | null;
  name: string;
  children?: never;
  depth?: number;
  description?: string;
}
