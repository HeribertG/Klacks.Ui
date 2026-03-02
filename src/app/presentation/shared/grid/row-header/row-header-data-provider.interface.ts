// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IRowHeaderDataProvider {
  getRowCount(): number;
  getClientName(index: number): string;
  getTotalCount(): number;
}
