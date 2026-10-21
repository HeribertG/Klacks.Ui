// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ITestConnectionResult {
  success: boolean;
  errorMessage?: string;
  userCount?: number;
  sampleUsers?: string[];
}
