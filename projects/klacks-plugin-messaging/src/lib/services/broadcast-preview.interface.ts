// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface BroadcastPreview {
  total: number;
  withMessengerContact: number;
  withPhoneFallback: number;
  skipped: number;
  providerSupportsPhoneFallback: boolean;
}
