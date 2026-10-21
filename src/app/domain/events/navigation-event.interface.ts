// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface NavigationEvent {
  route: string;
  params?: Record<string, unknown>;
}
