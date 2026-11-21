// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface LocalTtsStatus {
  installed: boolean;
  pending: boolean;
  lastError: string | null;
  licenseAccepted: boolean;
  licenseAcceptedAt: string | null;
  sizeBytes: number;
}
