// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

// Extended interfaces for test framework detection
export interface WindowWithTestFrameworks extends Window {
  Cypress?: unknown;
  __PLAYWRIGHT__?: unknown;
}
