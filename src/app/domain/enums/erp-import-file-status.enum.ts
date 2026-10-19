// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export enum ErpImportFileStatus {
  Received = 0,
  Importing = 1,
  Completed = 2,
  CompletedWithWarnings = 3,
  Failed = 4,
  Interrupted = 5,
}
