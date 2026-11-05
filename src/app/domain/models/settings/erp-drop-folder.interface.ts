// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IErpDropFolder {
  installation: string;
  folderPath: string;
  containerPath: string | null;
  isHostPath: boolean;
}
