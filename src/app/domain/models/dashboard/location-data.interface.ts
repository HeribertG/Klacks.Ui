// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface LocationData {
  city: string;
  country: string;
  count: number;
  employeeCount: number;
  externEmpCount: number;
  customerCount: number;
  latitude?: number;
  longitude?: number;
}
