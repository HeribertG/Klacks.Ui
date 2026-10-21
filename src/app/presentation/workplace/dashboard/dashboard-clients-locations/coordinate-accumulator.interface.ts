// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface CoordinateAccumulator {
  latitudeSum: number;
  longitudeSum: number;
  count: number;
}
