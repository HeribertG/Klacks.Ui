// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export const WhisperOperationTypes = {
  Install: 'WhisperInstall',
  Uninstall: 'WhisperUninstall',
} as const;

export const WhisperOperationStatuses = {
  Pending: 'Pending',
  Running: 'Running',
  Succeeded: 'Succeeded',
  Failed: 'Failed',
} as const;
