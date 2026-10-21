// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ErrorEvent {
  message: string;
  messageParams?: Record<string, unknown>;
  code?: string;
  context?: string;
}
