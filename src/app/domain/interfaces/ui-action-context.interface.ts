// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IUiActionContext {
  params: Record<string, unknown>;
  results: Record<string, unknown>;
  callId: string;
  /** Polled between steps; absent means "never cancellable" (all existing non-Klacksy-stop call sites). */
  isCancelled?: () => boolean;
}
