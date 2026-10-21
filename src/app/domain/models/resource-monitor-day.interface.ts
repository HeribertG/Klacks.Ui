// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IResourceMonitorDay {
  date: string;
  wunschCount: number;
  maxCount: number;
  totalCount: number;
  dienstCount: number;
  absenzCount: number;
}
