// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IUpdateAvailability {
  currentVersion: string;
  latestVersion: string;
  containsMigrations: boolean;
  isUpdateAvailable: boolean;
}
