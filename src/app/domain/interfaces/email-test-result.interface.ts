// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface EmailTestResult {
  success: boolean;
  message: string;
  messageKey?: string;
  messageParams?: Record<string, string>;
  errorDetails?: string;
}
