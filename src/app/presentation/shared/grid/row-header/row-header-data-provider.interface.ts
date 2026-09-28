// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IRowHeaderDataProvider {
  getRowCount(): number;
  getClientName(index: number): string;
  getTotalCount(): number;
}
