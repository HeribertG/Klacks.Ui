// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface WorkEditValidation {
  isValid: boolean;
  durationMinutes: number;
  errorKey?: string;
}
